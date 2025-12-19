import fs from 'node:fs/promises';
import picomatch from 'picomatch';

type GlobOptions = {

	/**
	 * Include hidden files/directories (starting with .)
	 * @default false
	 */
	dot?: boolean;
};

/**
 * Glob utility using fs.readdir + picomatch
 * Matches both files and directories, stops descending into matched directories
 *
 * Caller is responsible for path resolution and validation.
 */
export const glob = async (
	root: string,
	globPattern: string,
	options?: GlobOptions,
): Promise<string[]> => {
	const includeDot = options?.dot ?? false;
	const isMatch = picomatch(globPattern, { dot: includeDot });
	const isRecursive = globPattern.includes('**');
	const results: string[] = [];
	const rootPrefix = root.length + 1;

	const crawl = async (directory: string): Promise<void> => {
		const entries = await fs.readdir(directory, { withFileTypes: true });
		const subdirectories: Promise<void>[] = [];

		for (const entry of entries) {
			const fullPath = `${directory}/${entry.name}`;
			const relativePath = fullPath.slice(rootPrefix);

			// Check for match - picomatch handles explicit dots in patterns
			// e.g., "**/.cache" will match .cache even with dot:false
			if (isMatch(relativePath)) {
				results.push(fullPath);
				continue; // Don't descend into matched directories
			}

			// Only descend into directories
			if (entry.isDirectory() && isRecursive) {
				// Skip dotfile directories unless dot mode is enabled
				if (!includeDot && entry.name.startsWith('.')) {
					continue;
				}
				subdirectories.push(crawl(fullPath));
			}
		}

		await Promise.all(subdirectories);
	};

	await crawl(root);
	return results;
};
