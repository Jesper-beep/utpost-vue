import type { TourLog } from "@utpost/shared";

export const elevationGain = (logs: TourLog[]): number =>
	logs.reduce((sum, log, i) => {
		if (i === 0) return 0;
		const diff = log.elevation_m - logs[i - 1].elevation_m;
		return diff > 0 ? sum + diff : sum;
	}, 0);
