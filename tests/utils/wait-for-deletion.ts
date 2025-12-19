import fs from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

// Poll until file is deleted
export const waitForDeletion = async (
	filePath: string,
	interval = 50,
) => {
	while (true) {
		const exists = await fs.access(filePath).then(() => true, () => false);
		if (!exists) {
			return Date.now();
		}
		await setTimeout(interval);
	}
};
