import os from 'node:os';
import { glob } from '../../src/utils/fs-glob.ts';

const tempDirectory = os.tmpdir();

// Get poof temp files from both:
// 1. System tempdir (primary strategy)
// 2. Fixture directory (fallback strategy for cross-device renames)
export const getTempFiles = async (fixtureDirectory: string) => {
	const [tempFiles, siblingFiles] = await Promise.all([
		glob(tempDirectory, 'poof-*'),
		glob(fixtureDirectory, '.poof-*', { dot: true }),
	]);

	return [...tempFiles, ...siblingFiles];
};
