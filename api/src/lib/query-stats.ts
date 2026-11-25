import { AsyncLocalStorage } from "node:async_hooks";

export interface QueryStats {
	queries: number;
}

const storage = new AsyncLocalStorage<QueryStats>();

// Allt som körs i callback räknas mot samma stats, även efter await.
export const runWithQueryStats = <T>(
	stats: QueryStats,
	callback: () => T,
): T => {
	return storage.run(stats, callback);
};

// Anropas av varje databasfråga. Utanför runWithQueryStats gör den ingenting.
export const countQuery = (): void => {
	const stats = storage.getStore();
	if (stats !== undefined) {
		stats.queries += 1;
	}
};
