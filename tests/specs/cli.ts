import fs from 'node:fs/promises';
import path from 'node:path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { poofCli } from '../utils/poof-cli.ts';
import { glob } from '../../src/utils/fs-glob.ts';
import { waitForDeletion } from '../utils/wait-for-deletion.ts';

export default testSuite('CLI', ({ test }) => {
	test('shows help when no arguments provided', async () => {
		const { stdout } = await poofCli();
		expect(stdout).toContain('poof');
		expect(stdout).toContain('--dry');
	});

	test('dry run lists files without deleting', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'file.txt': 'content',
			'dir/nested.txt': 'nested content',
		});

		const poofProcess = await poofCli(['--dry', 'file.txt', 'dir'], {
			cwd: fixture.path,
		});

		onTestFail(() => console.log(poofProcess));

		expect(poofProcess.stdout).toContain('Would delete:');
		expect(await fixture.exists('file.txt')).toBe(true);
	});

	test('verbose mode logs deletions', async ({ onTestFail }) => {
		await using fixture = await createFixture({ 'file.txt': 'content' });
		const poofProcess = await poofCli(['--verbose', 'file.txt'], { cwd: fixture.path });
		onTestFail(() => console.log(poofProcess));
		expect(poofProcess.stdout).toContain('Removed: file.txt');
	}, {
		// Retry: Windows file handles can cause EBUSY during fs-fixture cleanup
		retry: 3,
	});

	test('removes single file', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'file.txt': 'content',
		});

		const poofProcess = await poofCli(['file.txt'], { cwd: fixture.path });
		onTestFail(() => console.log(poofProcess));

		expect(await fixture.exists('file.txt')).toBe(false);
	}, {
		// Retry: Windows file handles can cause EBUSY during fs-fixture cleanup
		retry: 3,
	});

	test('removes directory', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'dir/file.txt': 'content',
			'dir/nested/deep.txt': 'deep content',
		});

		const poofProcess = await poofCli(['dir'], { cwd: fixture.path });
		onTestFail(() => console.log(poofProcess));

		expect(await fixture.exists('dir')).toBe(false);
	}, {
		// Retry: Windows file handles can cause EBUSY during fs-fixture cleanup
		retry: 3,
	});

	test('removes multiple targets', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'file1.txt': 'content 1',
			'file2.txt': 'content 2',
			'dir/nested.txt': 'nested',
		});

		const poofProcess = await poofCli(['file1.txt', 'file2.txt', 'dir'], { cwd: fixture.path });
		onTestFail(() => console.log(poofProcess));

		expect(await fixture.exists('file1.txt')).toBe(false);
		expect(await fixture.exists('file2.txt')).toBe(false);
		expect(await fixture.exists('dir')).toBe(false);
	}, {
		// Retry: Windows file handles can cause EBUSY during fs-fixture cleanup
		retry: 3,
	});

	test('supports glob patterns', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'file1.txt': 'content 1',
			'file2.txt': 'content 2',
			'keep.md': 'keep this',
			'dir/keep.txt': 'keep this too',
		});

		const poofProcess = await poofCli(['*.txt'], { cwd: fixture.path });
		onTestFail(() => console.log(poofProcess));

		expect(await fixture.exists('file1.txt')).toBe(false);
		expect(await fixture.exists('file2.txt')).toBe(false);
		expect(await fixture.exists('keep.md')).toBe(true);
		expect(await fixture.exists('dir/keep.txt')).toBe(true);
	}, {
		// Retry: Windows file handles can cause EBUSY during fs-fixture cleanup
		retry: 3,
	});

	test('--ignore excludes matching paths', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'dist/bundle.js': 'bundle',
			'src/index.ts': 'source',
			'node_modules/foo/dist/index.js': 'foo',
		});

		const poofProcess = await poofCli(['**/dist', '--ignore', '**/node_modules/**'], { cwd: fixture.path });
		onTestFail(() => console.log(poofProcess));

		expect(await fixture.exists('dist')).toBe(false);
		expect(await fixture.exists('src/index.ts')).toBe(true);
		expect(await fixture.exists('node_modules/foo/dist/index.js')).toBe(true);
	}, {
		// Retry: Windows file handles can cause EBUSY during fs-fixture cleanup
		retry: 3,
	});

	test('exits silently when glob has no matches', async () => {
		await using fixture = await createFixture({});

		// Glob patterns that don't match anything exit silently (unlike explicit paths)
		const { stdout } = await poofCli(['*.nonexistent'], {
			cwd: fixture.path,
		});

		expect(stdout).toBe('');
	});

	test('exits with error for explicit non-existent path', async () => {
		await using fixture = await createFixture({});

		// Explicit paths that don't exist should report errors (like rm/ls)
		const result = poofCli(['nonexistent-file.txt'], {
			cwd: fixture.path,
		});

		await expect(result).rejects.toMatchObject({
			exitCode: 1,
			stderr: expect.stringContaining('nonexistent-file.txt'),
		});
	});

	test('errors on unknown flags with suggestion', async () => {
		await using fixture = await createFixture({});

		const result = poofCli(['--dyr', 'file.txt'], { cwd: fixture.path });
		await expect(result).rejects.toMatchObject({
			exitCode: 1,
			stderr: expect.stringContaining('Unknown flag: --dyr. (Did you mean --dry?)'),
		});
	});

	test('errors on unknown flags without suggestion when no close match', async () => {
		await using fixture = await createFixture({});

		const result = poofCli(['--xyz', 'file.txt'], { cwd: fixture.path });
		await expect(result).rejects.toMatchObject({
			exitCode: 1,
			stderr: expect.stringContaining('Unknown flag: --xyz.'),
		});
	});

	test('performance: exits quickly', async ({ onTestFail }) => {
		// Use empty files - rename is a metadata operation, file size doesn't affect performance
		const files: Record<string, string> = {};
		for (let i = 0; i < 100; i += 1) {
			files[`dir/file-${i}.bin`] = '';
		}
		await using fixture = await createFixture(files);

		// Create isolated temp directory for this test
		const testTmpdir = path.join(fixture.path, '.tmpdir');
		await fs.mkdir(testTmpdir, { recursive: true });

		const poofProcess = await poofCli(['dir'], {
			cwd: fixture.path,
			env: { TMPDIR: testTmpdir },
		});
		const { durationMs: cliDuration } = poofProcess;
		console.log(`CLI duration: ${cliDuration}ms`);
		const cliExitTime = Date.now();

		expect(await fixture.exists('dir')).toBe(false);
		// Windows CI has slow Node.js process spawning (~3s overhead)
		// The actual poof operation is fast (<200ms) - this threshold accounts for startup
		expect(cliDuration).toBeLessThan(5000);

		// Find the temp file in our isolated tmpdir
		const tempFiles = await glob(testTmpdir, 'poof-*');
		console.log(`tempFiles in testTmpdir: ${tempFiles.length}`);

		// Also check system temp dir (Windows uses TEMP/TMP, not TMPDIR)
		const os = await import('node:os');
		const systemTmpdir = os.tmpdir();
		const systemTempFiles = systemTmpdir === testTmpdir
			? []
			: await glob(systemTmpdir, 'poof-*');
		console.log(`tempFiles in system temp: ${systemTempFiles.length}`);

		// Use whichever location has the temp file
		const allTempFiles = [...tempFiles, ...systemTempFiles];
		const [tempFile] = allTempFiles;

		if (tempFile) {
			const deletionTime = await waitForDeletion(tempFile);
			console.log(`Background cleanup duration: ${deletionTime - cliExitTime}ms`);
		} else {
			console.log('WARNING: No poof temp file found - cannot measure background cleanup');
		}

		// Log state before fixture cleanup (always, not just on fail)
		const fixtureContents = await fs.readdir(fixture.path, { withFileTypes: true });
		console.log(`Fixture contents before cleanup: ${fixtureContents.map(d => d.name).join(', ')}`);

		// Debugging: Additional info on failure
		onTestFail(async () => {
			console.log('=== DEBUG INFO ON FAILURE ===');
			console.log('fixture.path:', fixture.path);
			console.log('testTmpdir:', testTmpdir);
			console.log('systemTmpdir:', systemTmpdir);
			console.log('tempFiles in testTmpdir:', tempFiles);
			console.log('tempFiles in system temp:', systemTempFiles);
			console.log('poofProcess.stderr:', poofProcess.stderr);
			console.log('poofProcess.command:', poofProcess.command);

			// Check what's still in fixture
			try {
				const contents = await fs.readdir(fixture.path, {
					withFileTypes: true,
					recursive: true,
				});
				console.log('All fixture contents (recursive):', contents.map(d => d.name));
			} catch (error) {
				console.log('fixture readdir error:', error);
			}

			// Environment
			console.log('process.env.TMPDIR:', process.env.TMPDIR);
			console.log('process.env.TEMP:', process.env.TEMP);
			console.log('process.env.TMP:', process.env.TMP);
			console.log('process.platform:', process.platform);
		});
	}, {
		// Retry: Windows file handles can cause EBUSY during fs-fixture cleanup
		retry: 3,
	});
});
