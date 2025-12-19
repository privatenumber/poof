/**
 * Maps over items with limited concurrency (like p-map)
 * Supports both arrays and async iterables
 */
export const concurrentMap = async <T>(
	items: T[] | AsyncIterable<T>,
	concurrency: number,
	callback: (item: T, index: number) => Promise<void>,
) => {
	const pending = new Set<Promise<void>>();
	let index = 0;

	for await (const item of items) {
		const currentIndex = index;
		index += 1;

		const p = callback(item, currentIndex);
		pending.add(p);

		// Only remove on success - rejected promises stay in pending for Promise.all to observe
		p.then(() => { pending.delete(p); }, () => {});

		if (pending.size >= concurrency) {
			await Promise.race(pending);
		}
	}

	await Promise.all(pending);
};
