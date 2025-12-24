import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDebug } from './utils/debug.ts';
import { resolvePatterns } from './core/resolve.ts';
import { startRmWorker } from './spawn-rm/index.ts';
import type { Failure, Options, Result } from './types.ts';
import { concurrentMap } from './utils/concurrent-map.ts';
import { isWindowsLockingError, withRetry } from './utils/fs-retry.ts';

export type { Failure, Options, Result } from './types.ts';

const debug = createDebug('poof:rename');
const RENAME_CONCURRENCY = 100;

const poof = async (
	patterns: string | string[],
	options?: Options,
): Promise<Result> => {
	const patternArray = Array.isArray(patterns) ? patterns : [patterns];
	const cwd = options?.cwd ?? process.cwd();

	debug(`patterns: ${JSON.stringify(patternArray)}, cwd: ${cwd}`);

	// 1. Resolve (includes validation - O(P) instead of O(N))
	const resolveStart = performance.now();
	const { files, notFound } = await resolvePatterns(
		patternArray,
		cwd,
		options?.dangerous ?? false,
		options?.ignore,
	);
	debug(`resolve files=${files.length} time=${(performance.now() - resolveStart).toFixed(2)}ms`);

	const filesToDelete = files;

	// 3. Report Errors (NotFound)
	const errors: Failure[] = notFound.map((pattern) => {
		const error = new Error(`Path not found: ${pattern}`);
		(error as NodeJS.ErrnoException).code = 'ENOENT';
		return {
			path: pattern,
			error,
		};
	});

	if (options?.dry) {
		return {
			deleted: files,
			errors,
		};
	}

	// 5. Execute
	const deleted: string[] = [];
	if (filesToDelete.length > 0) {
		const renameStart = performance.now();
		const id = `poof-${crypto.randomUUID()}`;
		const tempDir = path.join(os.tmpdir(), id);
		let tempDirCreated: Promise<void> | undefined;

		const rmWriter = startRmWorker();
		const renamedParents: string[] = [];

		await concurrentMap(filesToDelete, RENAME_CONCURRENCY, async (target, index) => {
			const baseName = path.basename(target);

			if (!tempDirCreated) {
				tempDirCreated = fs.mkdir(tempDir).then(() => {
					debug(`temp dir created: ${tempDir}`);
				});
			}
			await tempDirCreated;

			const destinationPath = path.join(tempDir, `${index}-${baseName}`);
			debug(`rename ${target} -> ${destinationPath}`);

			try {
				await withRetry(() => fs.rename(target, destinationPath), isWindowsLockingError);
				renamedParents.push(target);
				return;
			} catch (error) {
				const { code } = error as NodeJS.ErrnoException;
				debug(`rename failed: ${target} (code=${code})`);

				if (code === 'ENOENT') {
					renamedParents.push(target); // Already gone
					return;
				}
				if (code !== 'EXDEV') {
					errors.push({
						path: target,
						error: error as Error,
					});
					return;
				}
			}

			// Fallback: Cross-device handling
			const fallbackPath = path.join(path.dirname(target), `.${id}-${index}-${baseName}`);
			try {
				await withRetry(() => fs.rename(target, fallbackPath), isWindowsLockingError);
				await rmWriter.write(fallbackPath);
				renamedParents.push(target);
			} catch (fallbackError) {
				const { code } = fallbackError as NodeJS.ErrnoException;
				if (code === 'ENOENT') {
					renamedParents.push(target);
					return;
				}
				errors.push({
					path: target,
					error: fallbackError as Error,
				});
			}
		});

		debug(`rename files=${renamedParents.length} time=${(performance.now() - renameStart).toFixed(2)}ms`);

		// Queue temp dir for deletion only after all renames complete (prevents race with bg process)
		const spawnStart = performance.now();
		if (tempDirCreated) {
			await rmWriter.write(tempDir);
		}
		await rmWriter.end();
		debug(`spawn time=${(performance.now() - spawnStart).toFixed(2)}ms`);

		// 6. Calculate Results
		// Use Set for O(1) lookup instead of O(n) array.some()
		const renamedSet = new Set(renamedParents);
		for (const file of files) {
			// Fast path: exact match
			if (renamedSet.has(file)) {
				deleted.push(file);
				continue;
			}
			// Check if any ancestor directory was renamed (walk up the path)
			let dir = file;
			while (dir.includes('/')) {
				dir = dir.slice(0, Math.max(0, dir.lastIndexOf('/')));
				if (renamedSet.has(dir)) {
					deleted.push(file);
					break;
				}
			}
		}
	}

	debug(`deleted ${deleted.length} files, ${errors.length} errors`);

	return {
		deleted,
		errors,
	};
};

export default poof;
