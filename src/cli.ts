import path from 'node:path';
import { cli } from 'cleye';
import { closest, distance } from 'fastest-levenshtein';
import packageJson from '../package.json' with { type: 'json' };
import poof, { type Failure } from './index.ts';

const knownFlags = ['dry', 'verbose', 'dangerous', 'version', 'help'];

const findClosestFlag = (unknown: string): string | undefined => {
	const match = closest(unknown, knownFlags);
	return distance(unknown, match) <= 2 ? match : undefined;
};

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
	description: packageJson.description,
	parameters: ['[globs...]'],
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
});

const unknownFlags = Object.keys(argv.unknownFlags);
if (unknownFlags.length > 0) {
	for (const flag of unknownFlags) {
		const closestMatch = findClosestFlag(flag);
		const suggestion = closestMatch ? ` (Did you mean --${closestMatch}?)` : '';
		console.error(`Unknown flag: --${flag}.${suggestion}`);
	}
	process.exit(1);
}

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
