import type { TourDetail, TourLog } from "@utpost/shared";

export const distanceKm = (tour?: TourDetail | null): number => {
	if (!tour) return 0;
	return Math.round(tour.distanceM / 100) / 10;
};

export const elevationGain = (logs: TourLog[]): number => {
	const logsWithElevation = logs.filter((log) => log.elevationM != null);
	return logsWithElevation.reduce((sum, log, i) => {
		if (i === 0) {
			return 0;
		}
		const currentElevation = log.elevationM ?? 0;
		const previousElevation = logsWithElevation[i - 1]?.elevationM ?? 0;

		const diffInElevation = currentElevation - previousElevation;

		if (diffInElevation > 0) {
			return sum + diffInElevation;
		} else {
			return sum;
		}
	}, 0);
};
