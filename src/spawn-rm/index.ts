import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createDebug } from '../utils/debug.ts';

const debug = createDebug('poof:rm');

// Resolve the cleanup script path via subpath import
const rmWorkerPath = fileURLToPath(import.meta.resolve('#rm-worker'));

/**
 * Spawn background rm process immediately and return a writer.
 * Paths are streamed as they become available to prevent zombie state
 * if the main process crashes mid-rename.
 */
export const startRmWorker = () => {
	debug(`spawning background rm process: ${rmWorkerPath}`);
	const child = spawn(process.execPath, [rmWorkerPath], {
		detached: true,
		stdio: ['pipe', 'ignore', 'ignore'],
		windowsHide: true,
		cwd: '/', // Don't hold reference to parent's cwd (allows directory deletion on Windows)
	});

	const stdin = child.stdin!;
	child.unref();
	debug(`background rm process started (pid: ${child.pid})`);

	return {
		/**
		 * Stream path to child process (null-delimited for filenames with newlines).
		 *
		 * Backpressure handling is critical here for three reasons:
		 * 1. Instant exit: Without it, end() blocks until child consumes the ~64KB pipe buffer,
		 *    causing the CLI to hang at exit instead of returning instantly.
		 * 2. Data safety: We only rename files at the pace we can communicate to the cleaner.
		 *    If parent crashes, orphaned temp files are limited to what's in the pipe, not
		 *    unbounded paths sitting in Node.js memory.
		 * 3. Memory: Large directories (monorepo node_modules) can have 500k+ files.
		 *    Buffering all paths in memory risks OOM in constrained environments.
		 */
		write(filePath: string) {
			debug(`queue for deletion: ${filePath}`);
			const canContinue = stdin.write(`${filePath}\0`);
			if (!canContinue) {
				debug('backpressure - waiting for drain');
				return new Promise<void>((resolve) => {
					stdin.once('drain', resolve);
				});
			}
		},

		/**
		 * Signal end of paths and wait for buffer to flush to OS pipe.
		 * After this resolves, all paths are in the kernel pipe buffer and the
		 * detached child will continue cleanup even after parent exits.
		 */
		end: () => new Promise<void>((resolve, reject) => {
			debug('ending stdin stream');
			stdin.end(
				(error?: Error | null) => (error ? reject(error) : resolve()),
			);
		}),
	};
};
