import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import spawn from 'nano-spawn';
import prettyBytes from 'pretty-bytes';
import { createFixture } from './create-fixture.ts';

const ITERATIONS = 5;
const POOF_BIN = path.resolve(import.meta.dirname, '../dist/cli.mjs');
const RIMRAF_BIN = path.resolve(import.meta.dirname, 'node_modules/rimraf/dist/esm/bin.mjs');

const runners = [
	{
		name: 'poof',
		run: (files: string[], cwd: string) => spawn(process.execPath, [POOF_BIN, '--dangerous', ...files], { cwd }),
	},
	{
		name: 'rm -rf',
		run: (files: string[], cwd: string) => spawn('rm', ['-rf', ...files], { cwd }),
	},
	{
		name: 'rimraf',
		run: (files: string[], cwd: string) => spawn(process.execPath, [RIMRAF_BIN, ...files], { cwd }),
	},
];

const fixtureBase = path.join(os.tmpdir(), `poof-bench-${Date.now()}`);
const results = new Map<string, number[]>();

console.log('Benchmark');
console.log('=========');

for (let i = 0; i < ITERATIONS; i += 1) {
	console.log(`\nIteration ${i + 1}/${ITERATIONS}`);

	// Shuffle to avoid cache bias
	const queue = [...runners].sort(() => Math.random() - 0.5);

	for (const runner of queue) {
		const id = `${i}-${runner.name.replaceAll(' ', '-')}`;
		const cwd = path.join(fixtureBase, id);

		process.stdout.write(`  [${runner.name}] Creating fixture... `);
		const fixtureStart = performance.now();
		const stats = await createFixture(cwd);
		const fixtureTime = ((performance.now() - fixtureStart) / 1000).toFixed(1);
		process.stdout.write(`${fixtureTime}s (${prettyBytes(stats.bytes)}, ${stats.files.toLocaleString()} files) Running... `);

		const start = performance.now();
		await runner.run(stats.nodeModulesPaths, cwd);
		const duration = performance.now() - start;

		console.log(`${duration.toFixed(2)}ms`);

		const current = results.get(runner.name) ?? [];
		results.set(runner.name, [...current, duration]);
	}
}

console.log('\nResults');
console.log('=======');

const averages = Array.from(results.entries()).map(([name, times]) => ({
	name,
	average: times.reduce((a, b) => a + b, 0) / times.length,
})).sort((a, b) => a.average - b.average);

for (const { name, average } of averages) {
	const baseline = averages[0].average;
	const diff = name === averages[0].name ? '' : ` (${(average / baseline).toFixed(1)}x slower)`;
	console.log(`${name.padEnd(10)} ${average.toFixed(2)}ms${diff}`);
}

// Cleanup
await fs.rm(fixtureBase, {
	recursive: true,
	force: true,
});
