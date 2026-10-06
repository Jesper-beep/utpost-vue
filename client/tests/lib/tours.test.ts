import type { TourDetail, TourLog } from "@utpost/shared";
import { describe, expect, it } from "vitest";
import { distanceKm, elevationGain } from "../../src/lib/tours";

const log = (elevation_m: number | null, id = 0): TourLog => ({
	elevation_m,
	heart_rate: null,
	id,
	lat: 67.9,
	lon: 18.5,
	note: null,
	recorded_at: "2026-09-01T08:00:00.000Z",
	tour_id: 1,
});
const tour: TourDetail = {
	distance_m: 1234,
	guide_id: null,
	id: 1,
	logs: [],
	notes: null,
	photos: [],
	started_at: "2026-09-01T08:00:00.000Z",
	title: "Testtur",
	user_id: 1,
};

describe("elevationGain", () => {
	it("summerar bara stigningar, inte nedförsbackar", () => {
		expect(elevationGain([log(100), log(150), log(120), log(180)])).toBe(110);
	});
	it("ger 0 för en tur utan mätpunkter", () => {
		expect(elevationGain([])).toBe(0);
	});
	it("hoppar över mätpunkter utan höjd i stället för att räkna dem som noll", () => {
		expect(elevationGain([log(100), log(null), log(150)])).toBe(50);
	});
});

describe("distanceKm", () => {
	it("avrundar distance_m till km korrekt", () => {
		expect(distanceKm(tour)).toBe(1.2);
	});
	it("ger 0 för tom tour", () => {
		const emptyTour: TourDetail = {
			...tour,
			distance_m: 0,
			title: "Tom tur",
		};
		expect(distanceKm(emptyTour)).toBe(0);
	});
	it("ger 0 för undefined/null tour", () => {
		expect(distanceKm(undefined)).toBe(0);
		expect(distanceKm(null)).toBe(0);
	});
});
