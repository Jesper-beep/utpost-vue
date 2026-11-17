import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PhotoUploadResponse } from "@utpost/shared";
import express from "express";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { config } from "../src/config.js";
import { pool } from "../src/db/client.js";
import { sign } from "../src/lib/auth.js";
import {
	ImageFunctionError,
	InvalidPhotoError,
	type ProcessedPhoto,
	requestPhotoProcessing,
} from "../src/lib/imageFunction.ts";
import { getPhotoPath } from "../src/lib/photos.ts";
import { photosRouter } from "../src/routes/photos.ts";

vi.mock("../src/config.js", () => ({
	config: { jwtSecret: "test-secret", uploadDir: "" },
}));
vi.mock("../src/db/client.js", () => ({ pool: { query: vi.fn() } }));
vi.mock("../src/lib/imageFunction.ts", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/lib/imageFunction.ts")>()),
	requestPhotoProcessing: vi.fn(),
}));

const OWNER_ID = 1;
const OTHER_USER_ID = 2;
const TOUR_ID = 10;
const PHOTO_KEY = "0123456789abcdef0123456789abcdef";
const SMALL_VARIANT_BYTES = Buffer.from([0, 1, 2]);
const LARGE_VARIANT_BYTES = Buffer.from([3, 4, 5]);

const processedPhoto: ProcessedPhoto = {
	coldStart: true,
	height: 1080,
	instance: "test-instance",
	key: PHOTO_KEY,
	processingMs: 1234,
	variants: [
		{
			dataBase64: SMALL_VARIANT_BYTES.toString("base64"),
			height: 144,
			sizeBytes: 3,
			width: 256,
		},
		{
			dataBase64: LARGE_VARIANT_BYTES.toString("base64"),
			height: 1080,
			sizeBytes: 3,
			width: 1920,
		},
	],
	width: 1920,
};

const savedPhotoRow = {
	created_at: "2026-11-09T10:00:00.000Z",
	filename: PHOTO_KEY,
	height: 1080,
	id: 7,
	tour_id: TOUR_ID,
	width: 1920,
};

let uploadDirectory: string;
let testServer: Server;
let photosUrl: string;

const createLoginToken = (userId: number): string => {
	return sign({ email: "test@example.com", id: userId, role: "member" });
};

const postPhoto = (imageBytes: Uint8Array<ArrayBuffer>, userId = OWNER_ID) => {
	return fetch(`${photosUrl}?tourId=${TOUR_ID}`, {
		body: imageBytes,
		headers: {
			Authorization: `Bearer ${createLoginToken(userId)}`,
			"Content-Type": "image/jpeg",
		},
		method: "POST",
	});
};

const mockTourOwnedBy = (userId: number, photoCount = 0) => {
	vi.mocked(pool.query).mockResolvedValueOnce({
		rows: [{ photo_count: photoCount, user_id: userId }],
	} as never);
};

const mockSavedPhotoRow = () => {
	vi.mocked(pool.query).mockResolvedValueOnce({
		rows: [savedPhotoRow],
	} as never);
};

beforeAll(async () => {
	const expressApp = express();
	expressApp.use("/api/photos", photosRouter);
	testServer = expressApp.listen(0, "127.0.0.1");
	await new Promise<void>((resolve) => testServer.once("listening", resolve));
	const { port } = testServer.address() as AddressInfo;
	photosUrl = `http://127.0.0.1:${port}/api/photos`;
});

afterAll(async () => {
	testServer.closeAllConnections();
	await new Promise((resolve) => testServer.close(resolve));
});

beforeEach(async () => {
	uploadDirectory = await mkdtemp(join(tmpdir(), "utpost-photos-"));
	config.uploadDir = uploadDirectory;
});

afterEach(async () => {
	vi.resetAllMocks();
	vi.restoreAllMocks();
	await rm(uploadDirectory, { force: true, recursive: true });
});

describe("Uppladdning till API:et", () => {
	it("avvisar en bild som är större än 10 MB", async () => {
		mockTourOwnedBy(OWNER_ID);

		const response = await postPhoto(new Uint8Array(11 * 1024 * 1024));

		expect(response.status).toBe(413);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("avvisar en tom uppladdning", async () => {
		mockTourOwnedBy(OWNER_ID);

		const response = await postPhoto(new Uint8Array(0));

		expect(response.status).toBe(400);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("ger 401 utan token och kontrollerar inte turen", async () => {
		const response = await fetch(`${photosUrl}?tourId=${TOUR_ID}`, {
			body: new Uint8Array(100),
			headers: { "Content-Type": "image/jpeg" },
			method: "POST",
		});

		expect(response.status).toBe(401);
		expect(pool.query).not.toHaveBeenCalled();
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it.each(["1e0", "0x1", "01", "0", "-1", "abc", "2147483648"])(
		"avvisar tourId %s utan att fråga databasen",
		async (tourId) => {
			const response = await fetch(`${photosUrl}?tourId=${tourId}`, {
				body: new Uint8Array(100),
				headers: {
					Authorization: `Bearer ${createLoginToken(OWNER_ID)}`,
					"Content-Type": "image/jpeg",
				},
				method: "POST",
			});

			expect(response.status).toBe(400);
			expect(pool.query).not.toHaveBeenCalled();
			expect(requestPhotoProcessing).not.toHaveBeenCalled();
		},
	);

	it("ger 403 för någon annans tur redan innan bilden läses in, även när bilden är stor", async () => {
		mockTourOwnedBy(OWNER_ID);

		const response = await postPhoto(
			new Uint8Array(11 * 1024 * 1024),
			OTHER_USER_ID,
		);

		expect(response.status).toBe(403);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("ger 409 när turen redan har en bild och anropar inte bildfunktionen", async () => {
		mockTourOwnedBy(OWNER_ID, 1);

		const response = await postPhoto(new Uint8Array(100));

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "turen har redan en bild" });
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("ger 404 för en tur som inte finns och anropar inte bildfunktionen", async () => {
		vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);

		const response = await postPhoto(new Uint8Array(100));

		expect(response.status).toBe(404);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("ger 403 för någon annans tur och anropar inte bildfunktionen", async () => {
		mockTourOwnedBy(OWNER_ID);

		const response = await postPhoto(new Uint8Array(100), OTHER_USER_ID);

		expect(response.status).toBe(403);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});
});

describe("Uppladdning med bildfunktionen", () => {
	it("sparar varianterna och svarar med mått och tider, men utan bilddata", async () => {
		mockTourOwnedBy(OWNER_ID);
		mockSavedPhotoRow();
		vi.mocked(requestPhotoProcessing).mockResolvedValueOnce(processedPhoto);

		const response = await postPhoto(new Uint8Array(100));
		const body = (await response.json()) as PhotoUploadResponse;

		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			...savedPhotoRow,
			coldStart: true,
			instance: "test-instance",
			processingMs: 1234,
			variants: [
				{ height: 144, sizeBytes: 3, width: 256 },
				{ height: 1080, sizeBytes: 3, width: 1920 },
			],
		});
		expect(body.apiMs).toBeGreaterThanOrEqual(0);
		expect(pool.query).toHaveBeenLastCalledWith(
			expect.stringContaining("insert into photos"),
			[TOUR_ID, PHOTO_KEY, 1920, 1080],
		);
		expect(JSON.stringify(body)).not.toContain("dataBase64");
		expect((await readdir(uploadDirectory)).sort()).toEqual([
			`${PHOTO_KEY}-1920.avif`,
			`${PHOTO_KEY}-256.avif`,
		]);
		expect(
			await readFile(getPhotoPath(uploadDirectory, PHOTO_KEY, 256)),
		).toEqual(SMALL_VARIANT_BYTES);
	});

	it("skickar bilden och innehållstypen vidare till bildfunktionen", async () => {
		mockTourOwnedBy(OWNER_ID);
		mockSavedPhotoRow();
		vi.mocked(requestPhotoProcessing).mockResolvedValueOnce(processedPhoto);

		await postPhoto(new Uint8Array([1, 2, 3]));

		expect(requestPhotoProcessing).toHaveBeenCalledWith(
			Buffer.from([1, 2, 3]),
			"image/jpeg",
		);
	});

	it("ger 400 när bildfunktionen avvisar bilden", async () => {
		mockTourOwnedBy(OWNER_ID);
		vi.mocked(requestPhotoProcessing).mockRejectedValueOnce(
			new InvalidPhotoError("bilden är för liten"),
		);

		const response = await postPhoto(new Uint8Array(100));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "bilden är för liten" });
		expect(await readdir(uploadDirectory)).toEqual([]);
	});

	it("ger 502 när bildfunktionen inte går att nå", async () => {
		mockTourOwnedBy(OWNER_ID);
		vi.mocked(requestPhotoProcessing).mockRejectedValueOnce(
			new ImageFunctionError("bildfunktionen kunde inte nås"),
		);
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		const response = await postPhoto(new Uint8Array(100));

		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({
			error: "bildbehandlingen är inte tillgänglig",
		});
		expect(await readdir(uploadDirectory)).toEqual([]);
	});

	it("tar bort filerna igen när bilden inte kan sparas i databasen", async () => {
		mockTourOwnedBy(OWNER_ID);
		vi.mocked(pool.query).mockRejectedValueOnce(new Error("databasen nere"));
		vi.mocked(requestPhotoProcessing).mockResolvedValueOnce(processedPhoto);
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		const response = await postPhoto(new Uint8Array(100));

		expect(response.status).toBe(500);
		expect(await readdir(uploadDirectory)).toEqual([]);
	});
});
