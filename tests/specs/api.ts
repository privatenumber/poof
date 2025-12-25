import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import poof from '../../src/index.ts';
import { withRetry } from '../../src/utils/fs-retry.ts';

const rmWorkerPath = fileURLToPath(import.meta.resolve('#rm-worker'));

export default testSuite('API', ({ test, describe }) => {
	test('deletes single file', async () => {
		await using fixture = await createFixture({ 'file.txt': 'content' });

		await poof(fixture.getPath('file.txt'), { dangerous: true });

		expect(await fixture.exists('file.txt')).toBe(false);
	});

	test('deletes multiple files', async () => {
		await using fixture = await createFixture({
			'file1.txt': 'content 1',
			'file2.txt': 'content 2',
		});

		await poof([fixture.getPath('file1.txt'), fixture.getPath('file2.txt')], { dangerous: true });

		expect(await fixture.exists('file1.txt')).toBe(false);
		expect(await fixture.exists('file2.txt')).toBe(false);
	});

	test('dry run returns files without deleting', async ({ onTestFail }) => {
		await using fixture = await createFixture({ 'file.txt': 'content' });
		const target = fixture.getPath('file.txt');

		const result = await poof(target, {
			dry: true,
			dangerous: true,
		});

		onTestFail(() => console.log('target:', target, 'result.deleted:', result.deleted));

		expect(await fixture.exists('file.txt')).toBe(true);
		// Normalize to forward slashes for comparison (glob returns forward slashes on Windows)
		expect(result.deleted).toContain(target.replaceAll('\\', '/'));
		expect(result.errors).toEqual([]);
	});

	test('handles filenames with spaces', async () => {
		await using fixture = await createFixture({
			'cool file.txt': 'content',
			'another file.txt': 'more content',
		});

		await poof([fixture.getPath('cool file.txt'), fixture.getPath('another file.txt')], { dangerous: true });

		expect(await fixture.exists('cool file.txt')).toBe(false);
		expect(await fixture.exists('another file.txt')).toBe(false);
	});

	test('handles filenames with newlines', async ({ skip }) => {
		// Skip on Windows - newlines in filenames not supported
		if (process.platform === 'win32') {
			skip('Newlines in filenames not supported on Windows');
		}

		await using fixture = await createFixture({
			'normal.txt': 'normal',
		});

		// Create file with newline in name
		const fileWithNewline = fixture.getPath('file\nwith\nnewlines.txt');
		await fs.writeFile(fileWithNewline, 'content');

		await poof(fileWithNewline, { dangerous: true });

		expect(await fixture.exists('file\nwith\nnewlines.txt')).toBe(false);
		expect(await fixture.exists('normal.txt')).toBe(true);
	});

	test('handles filenames with emojis', async ({ skip }) => {
		// Skip on Windows - emoji glob cleanup has issues
		if (process.platform === 'win32') {
			skip('Emoji filenames have cleanup issues on Windows');
		}

		await using fixture = await createFixture({
			'🚀.txt': 'rocket',
			'🎉.txt': 'party',
		});

		await poof([fixture.getPath('🚀.txt'), fixture.getPath('🎉.txt')], { dangerous: true });

		expect(await fixture.exists('🚀.txt')).toBe(false);
		expect(await fixture.exists('🎉.txt')).toBe(false);
	});

	test('supports glob patterns (handling Windows backslashes)', async () => {
		await using fixture = await createFixture({
			'logs/a.log': 'a',
			'logs/b.log': 'b',
			'logs/keep.txt': 'keep',
		});

		// Construct an absolute glob pattern
		// On Windows: C:\Temp\logs -> C:/Temp/logs/*.log
		const pattern = fixture.getPath('logs/*.log').replaceAll(path.sep, '/');

		await poof(pattern, { dangerous: true });

		expect(await fixture.exists('logs/a.log')).toBe(false);
		expect(await fixture.exists('logs/b.log')).toBe(false);
		expect(await fixture.exists('logs/keep.txt')).toBe(true);
	});

	test('ignore option excludes matching paths', async () => {
		await using fixture = await createFixture({
			'dist/bundle.js': 'bundle',
			'packages/a/dist/index.js': 'a',
			'packages/b/dist/index.js': 'b',
			'node_modules/foo/dist/index.js': 'foo',
			'packages/node_modules/bar/dist/index.js': 'bar',
		});

		await poof('**/dist', {
			cwd: fixture.path,
			ignore: ['**/node_modules/**'],
		});

		// dist folders outside node_modules should be deleted
		expect(await fixture.exists('dist')).toBe(false);
		expect(await fixture.exists('packages/a/dist')).toBe(false);
		expect(await fixture.exists('packages/b/dist')).toBe(false);

		// dist folders inside node_modules should remain
		expect(await fixture.exists('node_modules/foo/dist/index.js')).toBe(true);
		expect(await fixture.exists('packages/node_modules/bar/dist/index.js')).toBe(true);
	});

	test('ignore patterns skip directory traversal (not just filtering)', async ({ skip }) => {
		// Skip on Windows - chmod doesn't enforce POSIX permissions
		if (process.platform === 'win32') {
			skip('chmod permissions not enforced on Windows');
		}

		await using fixture = await createFixture({
			'dist/bundle.js': 'bundle',
			'node_modules/foo/dist/index.js': 'foo',
		});

		// Make node_modules unreadable - will throw EACCES if we try to readdir it
		await fs.chmod(fixture.getPath('node_modules'), 0o000);

		try {
			// Should succeed if we prune correctly (never enters node_modules)
			// Should throw EACCES if we only filter results after traversing
			const result = await poof('**/dist', {
				cwd: fixture.path,
				ignore: ['**/node_modules/**'],
			});

			expect(result.deleted).toHaveLength(1);
			expect(await fixture.exists('dist')).toBe(false);
		} finally {
			// Restore permissions for cleanup
			await fs.chmod(fixture.getPath('node_modules'), 0o755);
		}
	});

	test('empty ignore array does not break matching', async () => {
		await using fixture = await createFixture({
			'dist/bundle.js': 'bundle',
		});

		const result = await poof('**/dist', {
			cwd: fixture.path,
			ignore: [],
		});

		expect(result.deleted).toHaveLength(1);
		expect(await fixture.exists('dist')).toBe(false);
	});

	test('ignore requires glob pattern to match nested paths', async () => {
		await using fixture = await createFixture({
			'cache/file.txt': 'root cache',
			'src/cache/file.txt': 'nested cache',
		});

		// Plain "cache" should NOT match "src/cache" - need "**/cache"
		await poof('**/cache', {
			cwd: fixture.path,
			ignore: ['cache'],
		});

		expect(await fixture.exists('cache')).toBe(true); // Ignored (matches "cache")
		expect(await fixture.exists('src/cache')).toBe(false); // Deleted (doesn't match "cache")
	});

	test('returns empty arrays when glob has no matches', async () => {
		await using fixture = await createFixture({});

		const result = await poof('*.nonexistent', { cwd: fixture.path });

		expect(result.deleted).toEqual([]);
		expect(result.errors).toEqual([]);
	});

	test('silently ignores explicit paths that do not exist (like rm -rf)', async () => {
		await using fixture = await createFixture({
			'exists.txt': 'content',
		});

		const result = await poof([
			fixture.getPath('exists.txt'),
			'nonexistent.txt',
			'also-missing.txt',
		], { cwd: fixture.path });

		// Existing file should be deleted
		expect(result.deleted).toHaveLength(1);
		expect(result.deleted.every(p => !p.includes('\\'))).toBe(true); // Always POSIX slashes
		expect(await fixture.exists('exists.txt')).toBe(false);

		// Missing explicit paths silently ignored (like rm -rf)
		expect(result.errors).toHaveLength(0);
	});

	test('finds files recursively with **/*.ext pattern', async () => {
		await using fixture = await createFixture({
			'a.txt': 'root',
			'dir/b.txt': 'nested',
			'dir/deep/c.txt': 'deep nested',
			'keep.md': 'keep this',
		});

		const result = await poof('**/*.txt', {
			cwd: fixture.path,
			dry: true,
		});

		expect(result.deleted).toHaveLength(3);
		expect(result.deleted.some(p => p.endsWith('a.txt'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('b.txt'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('c.txt'))).toBe(true);
	});

	test('deletes explicit dotfile path', async () => {
		await using fixture = await createFixture({
			'.hidden': 'secret',
			'.config/settings.json': '{}',
			'visible.txt': 'visible',
		});

		await poof(fixture.getPath('.hidden'), { dangerous: true });

		expect(await fixture.exists('.hidden')).toBe(false);
		expect(await fixture.exists('.config')).toBe(true);
		expect(await fixture.exists('visible.txt')).toBe(true);
	});

	test('glob pattern .* matches dotfiles', async () => {
		await using fixture = await createFixture({
			'.hidden': 'secret',
			'.cache': 'cache',
			'visible.txt': 'visible',
		});

		const result = await poof('.*', {
			cwd: fixture.path,
			dry: true,
		});

		expect(result.deleted).toHaveLength(2);
		expect(result.deleted.some(p => p.endsWith('.hidden'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('.cache'))).toBe(true);
	});

	test('glob pattern **/.cache finds dotfile directories', async () => {
		await using fixture = await createFixture({
			'.cache/data': 'root cache',
			'packages/a/.cache/data': 'nested cache',
			'packages/b/.cache/data': 'another cache',
			'packages/a/src/index.ts': 'code',
		});

		const result = await poof('**/.cache', {
			cwd: fixture.path,
			dry: true,
		});

		expect(result.deleted).toHaveLength(3);
		expect(result.deleted.some(p => p.endsWith('.cache'))).toBe(true);
	});

	test('**/.cache does not scan inside other hidden directories', async () => {
		await using fixture = await createFixture({
			// .cache at root level
			'.cache/data': 'root cache',
			// .cache directory inside .git (should NOT be found)
			'.git/.cache/should-not-match': 'git cache',
			// .cache file nested deeper inside .git (should NOT be found)
			'.git/hooks/.cache': 'git hooks cache',
			'.git/objects/abc123': 'git object',
			// .cache inside regular directory
			'src/.cache/data': 'src cache',
		});

		// **/.cache should find .cache directories but NOT scan inside .git
		const result = await poof('**/.cache', {
			cwd: fixture.path,
			dry: true,
		});

		// Verify both .git/.cache paths exist but weren't matched
		expect(await fixture.exists('.git/.cache')).toBe(true);
		expect(await fixture.exists('.git/hooks/.cache')).toBe(true);

		// Should find root .cache and src/.cache (2 total), but nothing inside .git
		expect(result.deleted).toHaveLength(2);
		expect(result.deleted.some(p => p.endsWith('.cache') && p.includes('src'))).toBe(true);
		expect(result.deleted.some(p => p.match(/[\\/]\.cache$/) && !p.includes('src'))).toBe(true);
		expect(result.deleted.some(p => p.includes('.git'))).toBe(false);
	});

	test('glob pattern descends into dotfile directories when targeting them', async () => {
		await using fixture = await createFixture({
			'.hidden/secret.txt': 'secret',
			'.hidden/nested/deep.txt': 'deep secret',
			'visible/file.txt': 'visible',
		});

		const result = await poof('.hidden/**/*.txt', {
			cwd: fixture.path,
			dry: true,
		});

		expect(result.deleted).toHaveLength(2);
		expect(result.deleted.some(p => p.includes('secret.txt'))).toBe(true);
		expect(result.deleted.some(p => p.includes('deep.txt'))).toBe(true);
	});

	test('matches files inside hidden parent when parent is in base path', async () => {
		await using fixture = await createFixture({
			'.github/workflows/ci.yml': 'yaml',
			'.github/workflows/deploy.yml': 'yaml',
			'.github/CODEOWNERS': 'owners',
		});

		// The base is '.github/workflows', the glob is '*.yml'
		// Works because base path is accessed directly, not discovered through glob
		const result = await poof('.github/workflows/*.yml', {
			cwd: fixture.path,
			dry: true,
		});

		expect(result.deleted).toHaveLength(2);
		expect(result.deleted.some(p => p.includes('ci.yml'))).toBe(true);
		expect(result.deleted.some(p => p.includes('deploy.yml'))).toBe(true);
	});

	test('** does not descend into hidden directories by default', async () => {
		await using fixture = await createFixture({
			'.github/workflows/ci.yml': 'yaml',
			'visible/workflows/ci.yml': 'yaml',
		});

		// Pattern **/ci.yml doesn't explicitly target dotfiles
		// So ** won't descend into .github (this is intentional)
		const result = await poof('**/ci.yml', {
			cwd: fixture.path,
			dry: true,
		});

		// Only finds the visible one, not the one in .github
		expect(result.deleted).toHaveLength(1);
		expect(result.deleted.some(p => p.includes('visible'))).toBe(true);
		expect(result.deleted.some(p => p.includes('.github'))).toBe(false);
	});

	test('**/.github pattern explicitly targets hidden .github directory', async () => {
		await using fixture = await createFixture({
			'.github/workflows/ci.yml': 'yaml',
			'pkg/.github/workflows/ci.yml': 'yaml',
		});

		// Pattern **/.github explicitly targets .github directories
		const result = await poof('**/.github', {
			cwd: fixture.path,
			dry: true,
		});

		expect(result.deleted).toHaveLength(2);
	});

	test('does not enable dot mode for ./* relative path pattern', async () => {
		await using fixture = await createFixture({
			'.env': 'secret',
			'.hidden': 'hidden',
			'file.txt': 'text',
		});

		// ./* means "current directory, all files" - NOT dotfiles
		const result = await poof('./*', {
			cwd: fixture.path,
			dry: true,
		});

		expect(result.deleted).toHaveLength(1);
		expect(result.deleted.some(p => p.endsWith('file.txt'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('.env'))).toBe(false);
		expect(result.deleted.some(p => p.endsWith('.hidden'))).toBe(false);
	});

	test('does not enable dot mode for ../* parent path pattern', async () => {
		await using fixture = await createFixture({
			'.env': 'secret',
			'file.txt': 'text',
			'subdir/keep.txt': 'keep',
		});

		// ../* from subdir means "parent directory, all files" - NOT dotfiles
		const result = await poof('../*', {
			cwd: fixture.getPath('subdir'),
			dangerous: true,
			dry: true,
		});

		// Should find file.txt and subdir, but NOT .env
		expect(result.deleted.some(p => p.endsWith('file.txt'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('.env'))).toBe(false);
	});

	test('./.*  pattern explicitly targets dotfiles in current directory', async () => {
		await using fixture = await createFixture({
			'.env': 'secret',
			'.hidden': 'hidden',
			'file.txt': 'text',
		});

		// ./.* means "current directory, dotfiles only"
		const result = await poof('./.*', {
			cwd: fixture.path,
			dry: true,
		});

		expect(result.deleted).toHaveLength(2);
		expect(result.deleted.some(p => p.endsWith('.env'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('.hidden'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('file.txt'))).toBe(false);
	});

	test('negation pattern !(.keep) enables dot mode to consider dotfiles', async () => {
		await using fixture = await createFixture({
			'.keep': 'save me',
			'.temp': 'delete me',
			'file.txt': 'text',
		});

		// Negation with dotfile reference enables dot mode
		const result = await poof('!(.keep)', {
			cwd: fixture.path,
			dry: true,
		});

		// Should match .temp and file.txt, but NOT .keep
		expect(result.deleted.some(p => p.endsWith('.temp'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('file.txt'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('.keep'))).toBe(false);
	});

	test('extglob negation matches dotfiles (picomatch behavior)', async () => {
		await using fixture = await createFixture({
			'.hidden': 'hidden',
			'keep.txt': 'keep',
			'delete.txt': 'delete',
		});

		// Extglob negation !(X) means "everything except X" - including dotfiles
		// This is picomatch's documented behavior: dot option only affects wildcards,
		// not extglob negations which explicitly define what to exclude
		const result = await poof('!(keep.txt)', {
			cwd: fixture.path,
			dry: true,
		});

		// Matches both delete.txt AND .hidden (everything except keep.txt)
		expect(result.deleted.some(p => p.endsWith('delete.txt'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('.hidden'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('keep.txt'))).toBe(false);
	});

	test('parent directory pattern ../ does not trigger dot mode', async () => {
		await using fixture = await createFixture({
			'.env': 'secret',
			'visible.txt': 'visible',
			'sub/file.txt': 'sub file',
		});

		// **/../* looks like it might have a dotfile, but .. is parent dir
		// This should NOT enable dot mode
		const result = await poof('sub/../*', {
			cwd: fixture.path,
			dry: true,
		});

		// Should find visible.txt and sub, but NOT .env
		expect(result.deleted.some(p => p.endsWith('visible.txt'))).toBe(true);
		expect(result.deleted.some(p => p.endsWith('.env'))).toBe(false);
	});

	test('brace expansion with dotfile enables dot mode', async () => {
		await using fixture = await createFixture({
			'src/.cache/data': 'cache',
			'bin/.cache/data': 'cache',
			'lib/file.txt': 'file',
			'.root-hidden': 'hidden',
		});

		// Brace expansion with ** and dotfile directory
		const result = await poof('**/{src,bin}/.cache', {
			cwd: fixture.path,
			dry: true,
		});

		// Should find both .cache directories (dot mode enabled by /.cache)
		expect(result.deleted).toHaveLength(2);
		expect(result.deleted.some(p => p.includes('src/.cache'))).toBe(true);
		expect(result.deleted.some(p => p.includes('bin/.cache'))).toBe(true);
	});

	test('nested brace expansion with dotfile enables dot mode', async () => {
		await using fixture = await createFixture({
			'.config/settings.json': 'config',
			'lib/index.ts': 'lib code',
			'src/main.ts': 'src code',
		});

		// Nested brace with dotfile: {src,{lib,.config}}
		const result = await poof('{src,{lib,.config}}/**/*', {
			cwd: fixture.path,
			dry: true,
		});

		// Should find .config/settings.json (dot mode enabled by ,.config in brace)
		expect(result.deleted.some(p => p.includes('.config'))).toBe(true);
		expect(result.deleted.some(p => p.includes('src/main.ts'))).toBe(true);
	});

	test('supports relative patterns with cwd option', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'src/index.ts': 'code',
			'src/utils/helper.ts': 'helper',
			'tests/test.ts': 'test',
		});

		const result = await poof('src/**/*.ts', {
			cwd: fixture.path,
			dry: true,
		});

		onTestFail(() => console.log('result.deleted:', result.deleted));

		expect(result.deleted).toHaveLength(2);
		expect(result.deleted.every(p => p.includes('/src/'))).toBe(true);
	});

	// Only run on Windows - backslash is a valid filename char on Unix
	if (path.sep === '\\') {
		test('normalizes Windows backslashes in patterns and cwd', async () => {
			await using fixture = await createFixture({
				'src/index.ts': 'code',
				'src/utils/helper.ts': 'helper',
			});

			// Simulate Windows-style paths with backslashes
			const windowsCwd = fixture.path.replaceAll('/', '\\');
			const windowsPattern = String.raw`src\**\*.ts`;

			const result = await poof(windowsPattern, {
				cwd: windowsCwd,
				dry: true,
			});

			expect(result.deleted).toHaveLength(2);
			expect(result.deleted.some(p => p.endsWith('index.ts'))).toBe(true);
			expect(result.deleted.some(p => p.endsWith('helper.ts'))).toBe(true);
		});
	}

	test('handles mixed direct paths and glob patterns', async () => {
		await using fixture = await createFixture({
			'direct.txt': 'direct',
			'a.log': 'log a',
			'b.log': 'log b',
		});

		const result = await poof([
			fixture.getPath('direct.txt'),
			'*.log',
		], {
			cwd: fixture.path,
			dry: true,
		});

		expect(result.deleted).toHaveLength(3);
	});

	test('handles concurrent poof calls safely', async () => {
		await using fixture = await createFixture({
			'a/file.txt': 'a',
			'b/file.txt': 'b',
			'c/file.txt': 'c',
		});

		// Run multiple poof calls concurrently
		const results = await Promise.all([
			poof(fixture.getPath('a'), { dangerous: true }),
			poof(fixture.getPath('b'), { dangerous: true }),
			poof(fixture.getPath('c'), { dangerous: true }),
		]);

		// All should succeed without conflicts
		expect(results.every(r => r.errors.length === 0)).toBe(true);
		expect(results.every(r => r.deleted.length === 1)).toBe(true);
		expect(await fixture.exists('a')).toBe(false);
		expect(await fixture.exists('b')).toBe(false);
		expect(await fixture.exists('c')).toBe(false);
	});

	test('optimizes **/dirname patterns', async () => {
		await using fixture = await createFixture({
			'a/node_modules/pkg/index.js': 'a',
			'b/node_modules/pkg/index.js': 'b',
			'c/deep/node_modules/pkg/index.js': 'c',
			'.hidden/node_modules/pkg/index.js': 'hidden', // Should be skipped
		});

		const result = await poof('**/node_modules', {
			cwd: fixture.path,
			dry: true,
		});

		// Should find all non-hidden node_modules
		expect(result.deleted).toHaveLength(3);
		expect(result.deleted.some(p => p.includes('.hidden'))).toBe(false);
	});

	test('handles multiple directories with same basename', async () => {
		await using fixture = await createFixture({
			'a/node_modules/pkg-a/index.js': 'a',
			'b/node_modules/pkg-b/index.js': 'b',
			'c/node_modules/pkg-c/index.js': 'c',
		});

		const result = await poof([
			fixture.getPath('a/node_modules'),
			fixture.getPath('b/node_modules'),
			fixture.getPath('c/node_modules'),
		], { dangerous: true });

		expect(result.errors).toEqual([]);
		expect(result.deleted).toHaveLength(3);
		expect(await fixture.exists('a/node_modules')).toBe(false);
		expect(await fixture.exists('b/node_modules')).toBe(false);
		expect(await fixture.exists('c/node_modules')).toBe(false);
	});

	test('filters nested paths when parent is also specified', async () => {
		await using fixture = await createFixture({
			'dir/subdir/file.txt': 'nested',
			'dir/other.txt': 'other',
		});

		// Specify both parent and descendant - descendant should be filtered out
		const result = await poof([
			fixture.getPath('dir'),
			fixture.getPath('dir/subdir'),
			fixture.getPath('dir/subdir/file.txt'),
		], { dangerous: true });

		expect(result.errors).toEqual([]);
		// All paths reported as deleted (from user's perspective)
		expect(result.deleted).toHaveLength(3);
		// But everything is actually gone
		expect(await fixture.exists('dir')).toBe(false);
	});

	test('filters nested paths from glob expansion', async () => {
		await using fixture = await createFixture({
			'node_modules/pkg-a/index.js': 'a',
			'node_modules/pkg-b/index.js': 'b',
		});

		// Glob that matches both parent and children
		// With streaming, explicit path is processed first, so glob may not find nested paths
		const result = await poof([
			fixture.getPath('node_modules'),
			'node_modules/**/*',
		], { cwd: fixture.path });

		expect(result.errors).toEqual([]);
		// At minimum, the explicit node_modules path is deleted
		expect(result.deleted.length).toBeGreaterThanOrEqual(1);
		expect(await fixture.exists('node_modules')).toBe(false);
	});

	describe('Safety', ({ test }) => {
		test('prevents deleting root', async () => {
			const { root } = path.parse(process.cwd());
			await expect(poof(root, { dangerous: true })).rejects.toThrow('Refusing to delete root');
		});

		test('prevents deleting paths outside cwd by default', async () => {
			await using fixture = await createFixture({
				'outside/file.txt': 'content',
				'project/dummy.txt': '', // fs-fixture needs content to create dir
			});

			const cwd = fixture.getPath('project');
			const target = fixture.getPath('outside/file.txt');

			await expect(poof(target, { cwd })).rejects.toThrow('Refusing to delete path outside cwd');
			expect(await fixture.exists('outside/file.txt')).toBe(true);
		});

		test('dangerous flag allows deleting paths outside cwd', async () => {
			await using fixture = await createFixture({
				'outside/file.txt': 'content',
				'project/dummy.txt': '',
			});

			const cwd = fixture.getPath('project');
			const target = fixture.getPath('outside/file.txt');

			await poof(target, {
				cwd,
				dangerous: true,
			});
			expect(await fixture.exists('outside/file.txt')).toBe(false);
		});
	});

	describe('Background Cleanup', ({ test }) => {
		test('CRITICAL: Background process clears temp files', async () => {
			await using fixture = await createFixture({
				'node_modules/pkg/index.js': '...',
				'dist/output.js': '...',
			});

			await poof(fixture.getPath('node_modules'), { dangerous: true });

			expect(await fixture.exists('node_modules')).toBe(false);

			const remaining = await fixture.readdir('');
			expect(remaining).toEqual(['dist']);
		});

		test('background script handles non-existent paths gracefully', async () => {
			const child = spawn(process.execPath, [rmWorkerPath], {
				stdio: ['pipe', 'ignore', 'ignore'],
			});

			// Send non-existent paths (null-delimited)
			child.stdin!.end('/nonexistent/path/1\0/nonexistent/path/2');

			// Should exit cleanly within timeout
			const exitCode = await new Promise<number | null>((resolve, reject) => {
				const timeout = globalThis.setTimeout(() => reject(new Error('Script hung')), 5000);
				child.on('exit', (code) => {
					clearTimeout(timeout);
					resolve(code);
				});
			});

			expect(exitCode).toBe(0);
		});

		test('background script handles permission denied gracefully', async ({ skip }) => {
			if (process.platform === 'win32' || process.getuid?.() === 0) {
				skip('Permission test not applicable on Windows or as root');
			}

			await using fixture = await createFixture({
				'protected/file.txt': 'content',
			});

			// Remove all permissions from directory (prevents deletion of contents)
			await fs.chmod(fixture.getPath('protected'), 0o000);

			const child = spawn(process.execPath, [rmWorkerPath], {
				stdio: ['pipe', 'ignore', 'ignore'],
			});

			child.stdin!.end(fixture.getPath('protected/file.txt'));

			const exitCode = await new Promise<number | null>((resolve, reject) => {
				const timeout = globalThis.setTimeout(() => reject(new Error('Script hung')), 5000);
				child.on('exit', (code) => {
					clearTimeout(timeout);
					resolve(code);
				});
			});

			// Should exit cleanly even if deletion failed
			expect(exitCode).toBe(0);

			// Restore permissions for cleanup
			await fs.chmod(fixture.getPath('protected'), 0o755);
		});
	});

	// Chaos tests - edge cases that stress regex boundaries and picomatch hand-off
	describe('Chaos', ({ test }) => {
		test('handles triple-dot filenames without enabling descent mode', async () => {
			await using fixture = await createFixture({
				'...': 'triple dot file',
				'.regular': 'hidden file',
				'sub/.../deep.txt': 'deeply nested triple dot',
			});

			// Case A: Exact match for "..." - should not trigger descendIntoDotDirs
			// because "..." has dot followed by dot, not dot followed by non-dot
			const resultA = await poof('...', {
				cwd: fixture.path,
				dry: true,
			});
			expect(resultA.deleted).toHaveLength(1);
			expect(resultA.deleted[0]).toContain('...');

			// Case B: Recursive pattern should find both "..." entries
			const resultB = await poof('**/...', {
				cwd: fixture.path,
				dry: true,
			});
			expect(resultB.deleted).toHaveLength(2);
		});

		test('comma in folder name does not trigger false-positive dot-mode', async () => {
			await using fixture = await createFixture({
				'folder,with,comma/file.txt': 'visible',
				'folder,with,comma/.hidden': 'should be safe',
			});

			// The comma is in the base path, not the glob.
			// picomatch.scan gives base: 'folder,with,comma', glob: '*'
			// Our regex tests against glob '*', not the base path
			const result = await poof('folder,with,comma/*', {
				cwd: fixture.path,
				dry: true,
			});

			expect(result.deleted).toHaveLength(1);
			expect(result.deleted[0]).toContain('file.txt');
			expect(result.deleted.some(p => p.includes('.hidden'))).toBe(false);
		});

		test('extglob negation excludes dotfiles without needing descent mode', async () => {
			await using fixture = await createFixture({
				'src/main.ts': 'code',
				'src/.DS_Store': 'junk',
				'lib/index.js': 'code',
				'lib/.DS_Store': 'junk',
			});

			// "Delete everything in src and lib EXCEPT .DS_Store"
			// Note: {src,lib}/!(.DS_Store) doesn't work because brace expansion at
			// pattern start prevents base path extraction, and our crawler doesn't
			// descend without **. Use separate patterns as workaround.
			const result = await poof(['src/!(.DS_Store)', 'lib/!(.DS_Store)'], {
				cwd: fixture.path,
				dry: true,
			});

			// This works because:
			// 1. Each pattern has clear base path (src/, lib/)
			// 2. We check ALL entries against the pattern (including dotfiles)
			// 3. picomatch handles extglob !(.DS_Store) - excludes matching items
			expect(result.deleted).toHaveLength(2);
			expect(result.deleted.some(p => p.endsWith('main.ts'))).toBe(true);
			expect(result.deleted.some(p => p.endsWith('index.js'))).toBe(true);
			expect(result.deleted.some(p => p.includes('.DS_Store'))).toBe(false);
		});
	});

	describe('Retry Utility', ({ test }) => {
		const alwaysRetry = () => true;
		const neverRetry = () => false;

		test('returns value on success', async () => {
			const result = await withRetry(() => Promise.resolve('success'), neverRetry);
			expect(result).toBe('success');
		});

		test('throws immediately when shouldRetry returns false', async () => {
			let attempts = 0;
			const error = new Error('Test error');

			await expect(
				withRetry(() => {
					attempts += 1;
					return Promise.reject(error);
				}, neverRetry),
			).rejects.toThrow('Test error');

			expect(attempts).toBe(1);
		});

		test('retries when shouldRetry returns true', async () => {
			let attempts = 0;

			const result = await withRetry(() => {
				attempts += 1;
				if (attempts < 3) {
					return Promise.reject(new Error('Retry me'));
				}
				return Promise.resolve('success after retry');
			}, alwaysRetry);

			expect(attempts).toBe(3);
			expect(result).toBe('success after retry');
		});

		test('throws after max retries on persistent failure', async () => {
			let attempts = 0;

			await expect(
				withRetry(() => {
					attempts += 1;
					return Promise.reject(new Error('Always fails'));
				}, alwaysRetry),
			).rejects.toThrow('Always fails');

			expect(attempts).toBe(3);
		});
	});
});
