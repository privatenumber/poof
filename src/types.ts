export type Options = {
	cwd?: string;
	dry?: boolean;

	/**
	 * Allow deleting paths outside of cwd.
	 * Required when any resolved path is not within the working directory.
	 * @default false
	 */
	dangerous?: boolean;

	/**
	 * Glob patterns to exclude from deletion.
	 * Matched files/directories will be filtered out of results.
	 */
	ignore?: string[];
};

export type Failure = {
	path: string;
	error: Error;
};

export type Result = {
	deleted: string[];
	errors: Failure[];
};

/**
 * Options for resolvePatterns - cwd is required, dry is not needed
 */
export type ResolveOptions = Pick<Options, 'dangerous' | 'ignore'> & { cwd: string };
