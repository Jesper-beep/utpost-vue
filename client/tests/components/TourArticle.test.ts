import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import type { Photo, TourDetail } from "@utpost/shared";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import TourArticle from "../../src/components/TourArticle.vue";
import { bigFetch } from "../../src/utils/bigFetch.js";

vi.mock("vue-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("vue-router")>()),
	useRoute: () => ({ params: { id: "7" } }),
}));
vi.mock("../../src/utils/bigFetch.js", () => ({ bigFetch: vi.fn() }));
const mockedBigFetch = vi.mocked(bigFetch);

const OWNER_ID = 1;
const OTHER_USER_ID = 2;

const foto = (id: number): Photo => ({
	created_at: "2026-11-09T10:00:00.000Z",
	filename: `nyckel${id}`,
	height: 1080,
	id,
	tour_id: 7,
	width: 1920,
});

const tur = (photos: Photo[]): TourDetail => ({
	distance_m: 8400,
	guide_id: null,
	id: 7,
	logs: [],
	notes: null,
	photos,
	started_at: "2026-11-01T10:00:00.000Z",
	title: "Morgontur",
	user_id: OWNER_ID,
});

const uppladdadFoto = foto(3);

const PhotoUploaderStub = defineComponent(
	(_props, { emit }) => {
		return () =>
			h(
				"button",
				{ onClick: () => emit("uploaded", uppladdadFoto), type: "button" },
				"Ladda upp",
			);
	},
	{ emits: ["uploaded"] },
);

const renderArticle = (photos: Photo[]) => {
	mockedBigFetch.mockResolvedValue({ data: tur(photos), loading: false });
	return render(TourArticle, {
		global: {
			plugins: [createPinia()],
			stubs: { PhotoUploader: PhotoUploaderStub },
		},
	});
};

const loggaIn = (userId: number) => {
	localStorage.setItem("token", "test-token");
	localStorage.setItem(
		"user",
		JSON.stringify({
			display_name: "Anna Berg",
			email: "anna@example.com",
			id: userId,
			role: "member",
		}),
	);
};

describe("TourArticle", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.resetAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it("visar turens bilder", async () => {
		renderArticle([foto(1), foto(2)]);

		expect(await screen.findAllByRole("img")).toHaveLength(2);
		expect(mockedBigFetch).toHaveBeenCalledWith("/api/tours", { id: "7" });
		expect(screen.getByAltText("Bild 1 från Morgontur")).toBeInTheDocument();
		expect(screen.getByAltText("Bild 2 från Morgontur")).toBeInTheDocument();
	});

	it("säger till när turen saknar bilder", async () => {
		renderArticle([]);

		expect(
			await screen.findByText("Turen har inga bilder än."),
		).toBeInTheDocument();
	});

	it("visar uppladdningen för turens ägare", async () => {
		loggaIn(OWNER_ID);
		renderArticle([]);

		expect(
			await screen.findByRole("button", { name: "Ladda upp" }),
		).toBeInTheDocument();
	});

	it("visar inte uppladdningen för någon annan än ägaren", async () => {
		loggaIn(OTHER_USER_ID);
		renderArticle([]);

		await screen.findByText("Morgontur");
		expect(
			screen.queryByRole("button", { name: "Ladda upp" }),
		).not.toBeInTheDocument();
	});

	it("visar inte uppladdningen när man inte är inloggad", async () => {
		renderArticle([]);

		await screen.findByText("Morgontur");
		expect(
			screen.queryByRole("button", { name: "Ladda upp" }),
		).not.toBeInTheDocument();
	});

	it("lägger till den uppladdade bilden bland bilderna", async () => {
		loggaIn(OWNER_ID);
		renderArticle([foto(1), foto(2)]);

		await fireEvent.click(
			await screen.findByRole("button", { name: "Ladda upp" }),
		);

		expect(await screen.findAllByRole("img")).toHaveLength(3);
		expect(screen.getByAltText("Bild 3 från Morgontur")).toBeInTheDocument();
	});
});
