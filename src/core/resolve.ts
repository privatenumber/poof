import fs from 'node:fs/promises';
import path from 'node:path';
import picomatch from 'picomatch';
import { createDebug } from '../utils/debug.ts';
import { concurrentMap } from '../utils/concurrent-map.ts';
import { glob } from '../utils/fs-glob.ts';

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

type ResolveOptions = {
	cwd: string;
	dangerous?: boolean;
	ignore?: string[];
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

export const resolvePatterns = async (
	patterns: string[],
	options: ResolveOptions,
): Promise<ResolveResult> => {
	const { cwd, dangerous = false, ignore } = options;
	const files: string[] = [];
	const notFound: string[] = [];

	await concurrentMap(patterns, GLOB_CONCURRENCY, async (pattern) => {
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
			return;
		}

		// Pass pre-computed root and glob pattern to avoid duplicate path resolution
		let root = scanned.base || toPosix(cwd);
		if (root.endsWith('/')) {
			root = root.slice(0, -1);
		}

		// Detect if we should descend into dotfile directories during crawl
		// Only needed when dotfile dirs are PATHS to search (not match targets)
		// - Brace expansion: {src,.config}/**/* → need to enter .config
		// - Pattern starts with dot: .*/**/* → need to enter dotfile dirs
		// NOT needed for:
		// - **/.cache → looking FOR .cache, not searching INSIDE hidden dirs
		//   (picomatch with dot:false won't match .git/.cache anyway)
		const descendIntoDotDirectories = /^\.[^\\/.]|[{,]\.[^\\/.]/.test(scanned.glob);

		const globStart = performance.now();
		const matches = await glob(root, scanned.glob, {
			dot: descendIntoDotDirectories,
			ignore,
		});
		debug(`glob pattern=${pattern} files=${matches.length} time=${(performance.now() - globStart).toFixed(2)}ms`);

		// Avoid spread to prevent stack overflow with 100k+ matches (V8 arg limit ~65k)
		for (const match of matches) {
			files.push(match);
		}
	});

	return {
		files,
		notFound,
	};
};
