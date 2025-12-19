import { setTimeout } from 'node:timers/promises';

const RETRY_COUNT = 3;

// Centralized Windows file locking error detection
const isWindows = process.platform === 'win32';
const windowsLockingCodes = new Set(['EBUSY', 'EPERM']);

export const isWindowsLockingError = (error: unknown) => (
	isWindows && windowsLockingCodes.has((error as NodeJS.ErrnoException).code ?? '')
);

/**
 * Retry an operation with exponential backoff.
 * Consumer specifies which errors are retryable via callback.
 */
export const withRetry = async <T>(
	operation: () => Promise<T>,
	shouldRetry: (error: unknown) => boolean,
): Promise<T> => {
	let lastError: unknown;

	for (let attempt = 0; attempt < RETRY_COUNT; attempt += 1) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			if (attempt < RETRY_COUNT - 1 && shouldRetry(error)) {
				await setTimeout(100 * (attempt + 1));
				continue;
			}

			throw error;
		}
	}

	throw lastError;
};
