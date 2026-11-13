import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import type { PhotoUploadResponse } from "@utpost/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PhotoUploader from "../../src/components/PhotoUploader.vue";
import { uploadPhoto } from "../../src/lib/photos.js";
import { setToken } from "../../src/lib/token.js";

vi.mock("../../src/lib/photos.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../src/lib/photos.js")>()),
	uploadPhoto: vi.fn(),
}));
const mockedUploadPhoto = vi.mocked(uploadPhoto);

const TOUR_ID = 7;

const svar = (coldStart: boolean): PhotoUploadResponse => ({
	apiMs: 5300,
	coldStart,
	created_at: "2026-11-09T10:00:00.000Z",
	filename: "0123456789abcdef0123456789abcdef",
	height: 1080,
	id: 1,
	instance: "funktion-1",
	processingMs: 5185,
	tour_id: TOUR_ID,
	variants: [
		{ height: 144, sizeBytes: 2048, width: 256 },
		{ height: 1080, sizeBytes: 983040, width: 1920 },
	],
	width: 1920,
});

const renderUploader = () =>
	render(PhotoUploader, { props: { tourId: TOUR_ID } });

const chooseImage = async () => {
	const image = new File(["bild"], "bild.jpg", { type: "image/jpeg" });
	await fireEvent.change(screen.getByLabelText("Välj en bild"), {
		target: { files: [image] },
	});
	return image;
};

const clickUpload = () =>
	fireEvent.click(screen.getByRole("button", { name: "Ladda upp" }));

describe("PhotoUploader", () => {
	beforeEach(() => {
		setToken("test-token");
		vi.resetAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it("går inte att ladda upp innan en bild är vald", () => {
		renderUploader();

		expect(screen.getByRole("button", { name: "Ladda upp" })).toBeDisabled();
	});

	it("skickar vald bild och tur till uppladdningen och meddelar att den är klar", async () => {
		mockedUploadPhoto.mockResolvedValue(svar(false));
		const { emitted } = renderUploader();

		const image = await chooseImage();
		await clickUpload();

		expect(await screen.findByText("Bilden är uppladdad")).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Bilden är uppladdad" }),
		).not.toBeInTheDocument();
		expect(mockedUploadPhoto).toHaveBeenCalledWith(
			"test-token",
			TOUR_ID,
			image,
		);
		expect(emitted()["uploaded"]).toEqual([[svar(false)]]);
	});

	it("gömmer Debug info tills man öppnar den", async () => {
		mockedUploadPhoto.mockResolvedValue(svar(false));
		renderUploader();

		await chooseImage();
		await clickUpload();

		await screen.findByText("Bilden är uppladdad");
		const debugInfo = screen.getByText("Debug info").closest("details");
		expect(debugInfo).not.toHaveAttribute("open");
	});

	it("visar svaret från bildfunktionen under Debug info", async () => {
		mockedUploadPhoto.mockResolvedValue(svar(true));
		renderUploader();

		await chooseImage();
		await clickUpload();

		const debugInfo = (await screen.findByText("Debug info")).closest(
			"details",
		);
		expect(debugInfo).toHaveTextContent("5185 ms");
		expect(debugInfo).toHaveTextContent("Variant 2");
	});

	it("visar att bilden laddas upp och går inte att skicka igen under tiden", async () => {
		mockedUploadPhoto.mockReturnValue(new Promise<never>(() => undefined));
		renderUploader();

		await chooseImage();
		await clickUpload();

		expect(await screen.findByText("Laddar upp bild...")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Ladda upp" })).toBeDisabled();
	});

	it("visar felet och meddelar inte att bilden är klar när uppladdningen misslyckas", async () => {
		mockedUploadPhoto.mockResolvedValue({
			error: "bildbehandlingen är inte tillgänglig",
		});
		const { emitted } = renderUploader();

		await chooseImage();
		await clickUpload();

		expect(
			await screen.findByText("bildbehandlingen är inte tillgänglig"),
		).toHaveAttribute("aria-live", "assertive");
		expect(screen.queryByText("Bilden är uppladdad")).not.toBeInTheDocument();
		expect(emitted()["uploaded"]).toBeUndefined();
	});
});
