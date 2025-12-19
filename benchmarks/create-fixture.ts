import fs from 'node:fs/promises';
import path from 'node:path';
import prettyBytes from 'pretty-bytes';

const CONFIG = {
	seed: 42,
	maxDepth: 7,
	foldersPerLevel: 4,
	filesPerFolder: 18,
	nodeModulesChance: 0.15,
	topLevelTrees: 23, // ~4GB total
	buffers: {
		small: Buffer.alloc(1024), // 1KB
		medium: Buffer.alloc(10 * 1024), // 10KB
		large: Buffer.alloc(50 * 1024), // 50KB
		extraLarge: Buffer.alloc(500 * 1024), // 500KB
	},
};

const createRandom = (seed: number) => {
	let state = seed;
	return () => {
		// eslint-disable-next-line no-bitwise
		state = (state * 1_103_515_245 + 12_345) & 0x7F_FF_FF_FF;
		return state / 0x7F_FF_FF_FF;
	};
};

const getName = (rng: () => number) => rng().toString(36).slice(2, 8);

const getSize = (n: number): keyof typeof CONFIG.buffers => {
	if (n < 0.6) {
		return 'small';
	}
	if (n < 0.85) {
		return 'medium';
	}
	if (n < 0.97) {
		return 'large';
	}
	return 'extraLarge';
};

export type FixtureStats = {
	folders: number;
	files: number;
	bytes: number;
	nodeModulesPaths: string[];
};

export const createFixture = async (root: string, verbose = false) => {
	if (verbose) {
		console.log(`Generating fixture in ${root} (Seed: ${CONFIG.seed})...`);
	}

	const stats: FixtureStats = {
		folders: 0,
		files: 0,
		bytes: 0,
		nodeModulesPaths: [],
	};

	const createLevel = async (dir: string, depth: number, seed: number) => {
		const rng = createRandom(seed);
		const isNodeModules = depth > 0 && rng() < CONFIG.nodeModulesChance;
		const name = isNodeModules ? 'node_modules' : getName(rng);
		const currentPath = depth === 0 ? dir : path.join(dir, name);

		await fs.mkdir(currentPath, { recursive: true });

		stats.folders += 1;
		if (isNodeModules) {
			stats.nodeModulesPaths.push(path.relative(root, currentPath));
		}

		// Create files
		const filePromises = Array.from({ length: CONFIG.filesPerFolder }).map(() => {
			const buffer = CONFIG.buffers[getSize(rng())];
			stats.files += 1;
			stats.bytes += buffer.length;
			return fs.writeFile(path.join(currentPath, `${getName(rng)}.bin`), buffer);
		});

		// Recurse directories
		const dirPromises: Promise<void>[] = [];
		if (depth < CONFIG.maxDepth) {
			const subfolders = Math.floor(rng() * CONFIG.foldersPerLevel) + 1;
			for (let i = 0; i < subfolders; i += 1) {
				dirPromises.push(createLevel(currentPath, depth + 1, seed * 5 + i));
			}
		}

		await Promise.all([...filePromises, ...dirPromises]);
	};

	// Create root directory
	await fs.mkdir(root, { recursive: true });
	stats.folders += 1;

	// Sequential execution to manage memory/file handles
	for (let i = 0; i < CONFIG.topLevelTrees; i += 1) {
		await createLevel(root, 1, CONFIG.seed * 1000 + i);
	}

	// Deduplicate and sort paths
	stats.nodeModulesPaths = [...new Set(stats.nodeModulesPaths)].sort();

	if (verbose) {
		console.log(`Created: ${stats.folders.toLocaleString()} folders, ${stats.files.toLocaleString()} files (${prettyBytes(stats.bytes)})`);
	}

	return stats;
};
