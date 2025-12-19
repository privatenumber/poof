import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
	describe, test, setProcessTimeout, expect,
} from 'manten';
import { waitForDeletion } from './utils/wait-for-deletion.ts';

// Windows CI needs more time for background cleanup processes
setProcessTimeout(process.env.CI ? 60_000 : 10_000);

// Set isolated temp directory for all tests
const testTmpdir = path.join(os.tmpdir(), `poof-test-${crypto.randomUUID()}`);
await fs.mkdir(testTmpdir, { recursive: true });

test('expect os.tmpdir() to be set to isolated test directory', () => {
	// Windows uses TEMP/TMP, Unix uses TMPDIR
	if (process.platform === 'win32') {
		process.env.TEMP = testTmpdir;
		process.env.TMP = testTmpdir;
	} else {
		process.env.TMPDIR = testTmpdir;
	}
	expect(os.tmpdir()).toBe(testTmpdir);
});

await describe('poof', ({ runTestSuite }) => {
	runTestSuite(import('./specs/cli.ts'));
	runTestSuite(import('./specs/api.ts'));
});

test('temp directory is empty after all tests', async () => {
	const allFiles = await fs.readdir(testTmpdir);
	await Promise.all(allFiles.map(file => waitForDeletion(path.join(testTmpdir, file))));
});
