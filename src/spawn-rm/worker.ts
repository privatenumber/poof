import fs from 'node:fs/promises';

// rm -rf opens file descriptors for directory traversal. Keep low to avoid
// EMFILE errors (default ulimit is often 256-1024 open files).
const CONCURRENCY = 16;
const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

/**
 * Parse null-delimited paths from stdin using Buffers.
 * Avoids string decoding issues with split multi-byte characters.
 */
async function* parseNullDelimitedPaths(stream: NodeJS.ReadableStream) {
	let buffer = Buffer.alloc(0);

	for await (const chunk of stream) {
		buffer = Buffer.concat([buffer, chunk as Buffer]);

		let nullIndex = buffer.indexOf(0);
		while (nullIndex !== -1) {
			const filePath = buffer.subarray(0, nullIndex);
			if (filePath.length > 0) {
				yield filePath;
			}
			buffer = buffer.subarray(nullIndex + 1);
			nullIndex = buffer.indexOf(0);
		}
	}

	if (buffer.length > 0) {
		yield buffer;
	}
}

// Simple concurrency pool without external dependencies
const pool = new Set<Promise<void>>();

for await (const filePath of parseNullDelimitedPaths(process.stdin)) {
	// fs.rm accepts Buffer directly - no string conversion needed
	const task = fs.rm(filePath, {
		recursive: true,
		force: true,
		maxRetries: MAX_RETRIES,
		retryDelay: RETRY_DELAY,
	}).catch(() => {
		// Silently ignore errors (force delete semantics)
	}).then(() => {
		pool.delete(task);
	});

	pool.add(task);

	if (pool.size >= CONCURRENCY) {
		await Promise.race(pool);
	}
}

await Promise.all(pool);
