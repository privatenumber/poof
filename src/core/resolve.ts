import fs from 'node:fs/promises';
import path from 'node:path';
import picomatch from 'picomatch';
import { createDebug } from '../utils/debug.ts';
import { concurrentMap } from '../utils/concurrent-map.ts';
import { glob } from '../utils/fs-glob.ts';
import type { ResolveOptions } from '../types.ts';

const debug = createDebug('poof:resolve');

// Normalize Windows backslashes to forward slashes
const toPosix = path.sep === '\\'
	? (filePath: string) => filePath.replaceAll('\\', '/')
	: (filePath: string) => filePath;

const GLOB_CONCURRENCY = 50;

type ResolveResult = {
	files: string[];
	notFound: string[];
};

/**
 * Validate a path before crawling.
 * Since fdir doesn't follow symlinks, validating the root guarantees all children are safe.
 */
const validatePath = (target: string, cwd: string, dangerous: boolean) => {
	const absoluteTarget = path.resolve(target);
	const { root } = path.parse(absoluteTarget);

	// Safety: Never delete root
	if (absoluteTarget === root) {
		throw new Error(`Refusing to delete root directory: ${absoluteTarget}`);
	}

	// Safety: Require dangerous flag for paths outside cwd
	if (!dangerous) {
		const normalizedCwd = toPosix(path.resolve(cwd));
		const normalizedTarget = toPosix(absoluteTarget);
		const isOutside = !normalizedTarget.startsWith(`${normalizedCwd}/`) && normalizedTarget !== normalizedCwd;

		if (isOutside) {
			throw new Error(
				`Refusing to delete path outside cwd. Pass { dangerous: true } to allow: ${absoluteTarget}`,
			);
		}
	}
};

// Detect if pattern requires descending into dotfile directories during crawl
// Only needed when dotfile dirs are PATHS to search (not match targets)
// - Brace expansion: {src,.config}/**/* → need to enter .config
// - Pattern starts with dot: .*/**/* → need to enter dotfile dirs
// NOT needed for:
// - **/.cache → looking FOR .cache, not searching INSIDE hidden dirs
//   (picomatch with dot:false won't match .git/.cache anyway)
const needsDotMode = (globPattern: string) => /^\.[^\\/.]|[{,]\.[^\\/.]/.test(globPattern);

type GlobGroup = {
	globs: string[];
	needsDot: boolean;
};

export const resolvePatterns = async (
	patterns: string[],
	options: ResolveOptions,
): Promise<ResolveResult> => {
	const { cwd, dangerous = false, ignore } = options;
	const files: string[] = [];
	const notFound: string[] = [];

	// Group glob patterns by their root directory for single-walk optimization
	const groups = new Map<string, GlobGroup>();

	for (const pattern of patterns) {
		const posixPattern = toPosix(pattern);
		const fullPattern = path.isAbsolute(pattern)
			? posixPattern
			: path.posix.join(toPosix(cwd), posixPattern);
		const scanned = picomatch.scan(fullPattern);

		debug(`pattern ${pattern} -> fullPattern ${fullPattern} (isGlob: ${scanned.isGlob})`);

		// Validate BEFORE crawling - O(P) instead of O(N)
		// For globs, validate the root; for explicit paths, validate the path itself
		const pathToValidate = scanned.isGlob ? (scanned.base || cwd) : fullPattern;
		validatePath(pathToValidate, cwd, dangerous);

		if (!scanned.isGlob) {
			// Handle explicit paths immediately (no grouping needed)
			await fs.access(fullPattern).then(
				() => {
					debug(`explicit path exists: ${fullPattern}`);
					files.push(fullPattern);
				},
				() => {
					debug(`explicit path not found: ${pattern}`);
					notFound.push(pattern);
				},
			);
			continue;
		}

		// Determine root directory for this glob
		let root = scanned.base || toPosix(cwd);
		if (root.endsWith('/')) {
			root = root.slice(0, -1);
		}

		// Add to group for this root
		const group = groups.get(root);
		if (group) {
			group.globs.push(scanned.glob);
			group.needsDot = group.needsDot || needsDotMode(scanned.glob);
		} else {
			groups.set(root, {
				globs: [scanned.glob],
				needsDot: needsDotMode(scanned.glob),
			});
		}
	}

	// Execute one filesystem walk per unique root
	await concurrentMap([...groups.keys()], GLOB_CONCURRENCY, async (root) => {
		const group = groups.get(root)!;

		const globStart = performance.now();
		const matches = await glob(root, group.globs, {
			dot: group.needsDot,
			ignore,
		});
		debug(
			`glob root=${root} patterns=${group.globs.length} `
			+ `matches=${matches.length} time=${(performance.now() - globStart).toFixed(2)}ms`,
		);

		for (const match of matches) {
			files.push(match);
		}
	});

	return {
		files,
		notFound,
	};
};
