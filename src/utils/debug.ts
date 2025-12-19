const isEnabled = (namespace: string) => (
	(process.env.DEBUG ?? '')
		.split(',')
		.some((pattern) => {
			const trimmed = pattern.trim();
			if (trimmed.endsWith('*')) {
				return namespace.startsWith(trimmed.slice(0, -1));
			}
			return namespace === trimmed;
		})
);

const noop = (..._args: unknown[]) => {};

export const createDebug = (namespace: string) => {
	if (!isEnabled(namespace)) {
		return noop;
	}

	return (...args: unknown[]) => {
		console.error(`${new Date().toISOString()} ${namespace}`, ...args);
	};
};
