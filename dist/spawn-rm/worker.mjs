#!/usr/bin/env node
import fs from 'node:fs/promises';

const CONCURRENCY = 16;
const MAX_RETRIES = 3;
const RETRY_DELAY = 100;
async function* parseNullDelimitedPaths(stream) {
  let buffer = Buffer.alloc(0);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
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
const pool = /* @__PURE__ */ new Set();
for await (const filePath of parseNullDelimitedPaths(process.stdin)) {
  const task = fs.rm(filePath, {
    recursive: true,
    force: true,
    maxRetries: MAX_RETRIES,
    retryDelay: RETRY_DELAY
  }).catch(() => {
  }).then(() => {
    pool.delete(task);
  });
  pool.add(task);
  if (pool.size >= CONCURRENCY) {
    await Promise.race(pool);
  }
}
await Promise.all(pool);
