import path from 'node:path';
import spawn, { type Options } from 'nano-spawn';

const cliPath = path.resolve('dist/cli.mjs');

export const poofCli = (
	args?: string[],
	options?: Options,
) => spawn(process.execPath, [cliPath, ...(args ?? [])], {
	...options,
	env: {
		// process.env.TMPDIR is overridden in tests/index.ts to isolate temp dirs
		TMPDIR: process.env.TMPDIR,

		// For Windows
		TEMP: process.env.TEMP,
		TMP: process.env.TMP,
		DEBUG: 'poof:*',
		...options?.env,
	},
});
