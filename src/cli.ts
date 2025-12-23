import path from 'node:path';
import { cli } from 'cleye';
import packageJson from '../package.json' with { type: 'json' };
import poof, { type Failure } from './index.ts';

const friendlyMessages: Record<string, string> = {
	EBUSY: 'Resource busy or locked',
	EPERM: 'Operation not permitted',
	ENOENT: 'File not found',
};

const formatError = ({ error }: Failure) => {
	const { code, message } = error as NodeJS.ErrnoException;
	if (code && code in friendlyMessages) {
		return friendlyMessages[code];
	}
	return message;
};

const argv = cli({
	name: packageJson.name,
	version: packageJson.version,
	parameters: ['[globs...]'],
	help: {
		description: packageJson.description,
	},
	flags: {
		dry: {
			type: Boolean,
			alias: 'd',
			description: 'Simulate the deletion',
		},
		verbose: {
			type: Boolean,
			alias: 'v',
			description: 'Log removed files',
		},
		dangerous: {
			type: Boolean,
			description: 'Allow deleting paths outside current directory',
		},
	},
	strictFlags: true,
});

(async () => {
	const { globs } = argv._;
	if (globs.length === 0) {
		argv.showHelp();
		return;
	}

	const cwd = process.cwd();
	const { deleted, errors } = await poof(globs, {
		dry: argv.flags.dry,
		dangerous: argv.flags.dangerous,
	});

	if (deleted.length === 0 && errors.length === 0) {
		console.warn('No matches found');
	}

	if (argv.flags.dry) {
		console.log('Dry run (no files deleted)');
		if (deleted.length > 0) {
			console.log('Would delete:');
			for (const file of deleted) {
				console.log(` - ${path.relative(cwd, file)}`);
			}
		}
		return;
	}

	if (argv.flags.verbose) {
		for (const file of deleted) {
			console.log(`Removed: ${path.relative(cwd, file)}`);
		}
	}

	if (errors.length > 0) {
		console.error('Errors:');
		for (const error of errors) {
			// For ENOENT, path is the original pattern; for others, it's absolute
			const displayPath = path.isAbsolute(error.path)
				? path.relative(cwd, error.path)
				: error.path;
			console.error(` - ${displayPath}: ${formatError(error)}`);
		}
		process.exit(1);
	}
})().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
