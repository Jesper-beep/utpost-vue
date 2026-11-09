import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/vue";
import type { PhotoUploadResponse } from "@utpost/shared";
import { afterEach, describe, expect, it } from "vitest";
import PhotoDebugInfo from "../../src/components/PhotoDebugInfo.vue";

const svar = (coldStart: boolean): PhotoUploadResponse => ({
	apiMs: 5300,
	coldStart,
	created_at: "2026-11-09T10:00:00.000Z",
	filename: "0123456789abcdef0123456789abcdef",
	height: 1080,
	id: 1,
	instance: "funktion-1",
	processingMs: 5185,
	tour_id: 7,
	variants: [
		{ height: 144, sizeBytes: 2048, width: 256 },
		{ height: 1080, sizeBytes: 983040, width: 1920 },
	],
	width: 1920,
});

const renderDebugInfo = (result: PhotoUploadResponse) =>
	render(PhotoDebugInfo, { props: { result } });

const valueUnder = (subHeading: string, position = 0) =>
	screen.getAllByText(subHeading)[position]?.nextElementSibling;

describe("PhotoDebugInfo", () => {
	afterEach(() => {
		cleanup();
	});

	it("har en rubrik för tider, bildfunktionen och varianter", () => {
		renderDebugInfo(svar(false));

		for (const title of ["Tider", "Bildfunktionen", "Varianter"]) {
			expect(screen.getByText(title).tagName).toBe("H4");
		}
	});

	it("visar tiderna under egna underrubriker", () => {
		renderDebugInfo(svar(false));

		expect(screen.getByText("Bildbehandling i funktionen").tagName).toBe("H5");
		expect(valueUnder("Bildbehandling i funktionen")).toHaveTextContent(
			"5185 ms",
		);
		expect(valueUnder("Hela uppladdningen i API:et")).toHaveTextContent(
			"5300 ms",
		);
	});

	it("visar vilken instans bildfunktionen körde på", () => {
		renderDebugInfo(svar(false));

		expect(valueUnder("Körde på")).toHaveTextContent("funktion-1");
	});

	it("visar att det var en kallstart", () => {
		renderDebugInfo(svar(true));

		expect(valueUnder("Kallstart")).toHaveTextContent("Ja");
	});

	it("visar att det inte var en kallstart", () => {
		renderDebugInfo(svar(false));

		expect(valueUnder("Kallstart")).toHaveTextContent("Nej");
	});

	it("visar dimension och storlek under en rubrik för varje variant", () => {
		renderDebugInfo(svar(false));

		expect(screen.getByText("Variant 1").tagName).toBe("H5");
		expect(screen.getByText("Variant 2").tagName).toBe("H5");
		expect(screen.getAllByText("Dimension")[0]?.tagName).toBe("H6");
		expect(valueUnder("Dimension", 0)).toHaveTextContent("256 × 144 px");
		expect(valueUnder("Storlek", 0)).toHaveTextContent("2 kB");
		expect(valueUnder("Dimension", 1)).toHaveTextContent("1920 × 1080 px");
		expect(valueUnder("Storlek", 1)).toHaveTextContent("960 kB");
	});
});
