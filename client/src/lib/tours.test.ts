import type { TourLog } from "@utpost/shared";
import { describe, expect, it } from "vitest";
import { elevationGain } from "./tours";

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
