export interface LogPointDocument {
	elevationM: number | null;
	heartRate: number | null;
	lat: number;
	lon: number;
	note: string | null;
	recordedAt: Date;
}

export interface TourDocument {
	distanceM: number;
	guideId: number | null;
	logs: LogPointDocument[];
	notes: string | null;
	startedAt: Date;
	stats: { points: number };
	title: string;
	tourId: number;
	userId: number;
}
