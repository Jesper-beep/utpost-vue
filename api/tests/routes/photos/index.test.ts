import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { eq } from "drizzle-orm";
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
import { z } from "zod";
import { config } from "../../../src/config/env.ts";
import { db, pool } from "../../../src/db/postgres.ts";
import { photos, tours } from "../../../src/db/schema/index.ts";
import {
	ImageFunctionError,
	InvalidPhotoError,
	type ProcessedPhoto,
	requestPhotoProcessing,
} from "../../../src/lib/imageFunction.ts";
import { getPhotoPath } from "../../../src/lib/photos.ts";
import { sign } from "../../../src/lib/token.ts";
import { photosRouter } from "../../../src/routes/photos/index.ts";

// Bara bildfunktionen är utbytt. Databasen är den riktiga, så testerna kräver att den är igång och seedad.
vi.mock("../../../src/lib/imageFunction.ts", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("../../../src/lib/imageFunction.ts")
	>()),
	requestPhotoProcessing: vi.fn(),
}));

const OWNER_ID = 1;
const OTHER_USER_ID = 2;
const NONEXISTENT_TOUR_ID = 2_147_483_647;
const PHOTO_KEY = "0123456789abcdef0123456789abcdef";
const SECOND_PHOTO_KEY = "fedcba9876543210fedcba9876543210";
const SMALL_VARIANT_BYTES = Buffer.from([0, 1, 2]);
const LARGE_VARIANT_BYTES = Buffer.from([3, 4, 5]);
const ELEVEN_MEGABYTES = 11 * 1024 * 1024;

const createProcessedPhoto = (key: string): ProcessedPhoto => ({
	coldStart: true,
	height: 1080,
	instance: "test-instance",
	key,
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
});

const uploadResponseSchema = z.object({
	apiMs: z.number(),
	coldStart: z.boolean(),
	createdAt: z.string(),
	filename: z.string(),
	height: z.number(),
	id: z.number(),
	instance: z.string(),
	processingMs: z.number(),
	tourId: z.number(),
	variants: z.array(
		z.object({ height: z.number(), sizeBytes: z.number(), width: z.number() }),
	),
	width: z.number(),
});

const errorSchema = z.object({ error: z.string() });

let uploadDirectory: string;
let testServer: Server;
let photosUrl: string;
let tourId: number;

const createLoginToken = (userId: number): string => {
	return sign({ email: "test@example.com", id: userId, role: "member" });
};

const postPhoto = (
	imageBytes: Uint8Array<ArrayBuffer>,
	{ queryTourId = String(tourId), userId = OWNER_ID } = {},
) => {
	return fetch(`${photosUrl}?tourId=${queryTourId}`, {
		body: imageBytes,
		headers: {
			Authorization: `Bearer ${createLoginToken(userId)}`,
			"Content-Type": "image/jpeg",
		},
		method: "POST",
	});
};

const countPhotoRows = async (): Promise<number> => {
	const rows = await db.select().from(photos).where(eq(photos.tourId, tourId));
	return rows.length;
};

beforeAll(async () => {
	const expressApp = express();
	expressApp.use("/api/photos", photosRouter);
	testServer = expressApp.listen(0, "127.0.0.1");
	await new Promise<void>((resolve) => testServer.once("listening", resolve));
	const address = testServer.address();
	if (address === null || typeof address === "string") {
		throw new Error("Testservern lyssnar inte på en port");
	}
	photosUrl = `http://127.0.0.1:${address.port}/api/photos`;
});

afterAll(async () => {
	testServer.closeAllConnections();
	await new Promise((resolve) => testServer.close(resolve));
	await pool.end();
});

beforeEach(async () => {
	uploadDirectory = await mkdtemp(join(tmpdir(), "utpost-photos-"));
	config.uploadDir = uploadDirectory;

	const [tour] = await db
		.insert(tours)
		.values({
			distanceM: 100,
			startedAt: new Date(),
			title: "Fototest",
			userId: OWNER_ID,
		})
		.returning();
	if (tour === undefined) {
		throw new Error("Testturen sparades inte");
	}
	tourId = tour.id;
});

afterEach(async () => {
	vi.resetAllMocks();
	vi.restoreAllMocks();
	await db.delete(tours).where(eq(tours.id, tourId));
	await rm(uploadDirectory, { force: true, recursive: true });
});

describe("Uppladdning till API:et", () => {
	it("avvisar en bild som är större än 10 MB", async () => {
		const response = await postPhoto(new Uint8Array(ELEVEN_MEGABYTES));

		expect(response.status).toBe(413);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("avvisar en tom uppladdning", async () => {
		const response = await postPhoto(new Uint8Array(0));

		expect(response.status).toBe(400);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("ger 401 utan token och kontrollerar inte turen", async () => {
		const findTour = vi.spyOn(db.query.tours, "findFirst");

		const response = await fetch(`${photosUrl}?tourId=${tourId}`, {
			body: new Uint8Array(100),
			headers: { "Content-Type": "image/jpeg" },
			method: "POST",
		});

		expect(response.status).toBe(401);
		expect(findTour).not.toHaveBeenCalled();
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it.each(["1e0", "0x1", "01", "0", "-1", "abc", "2147483648"])(
		"avvisar tourId %s utan att fråga databasen",
		async (invalidTourId) => {
			const findTour = vi.spyOn(db.query.tours, "findFirst");

			const response = await postPhoto(new Uint8Array(100), {
				queryTourId: invalidTourId,
			});

			expect(response.status).toBe(400);
			expect(findTour).not.toHaveBeenCalled();
			expect(requestPhotoProcessing).not.toHaveBeenCalled();
		},
	);

	it("ger 403 för någon annans tur redan innan bilden läses in, även när bilden är stor", async () => {
		const response = await postPhoto(new Uint8Array(ELEVEN_MEGABYTES), {
			userId: OTHER_USER_ID,
		});

		expect(response.status).toBe(403);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("ger 409 när turen redan har en bild och anropar inte bildfunktionen", async () => {
		await db
			.insert(photos)
			.values({ filename: PHOTO_KEY, height: 1080, tourId, width: 1920 });

		const response = await postPhoto(new Uint8Array(100));

		expect(response.status).toBe(409);
		expect(errorSchema.parse(await response.json())).toEqual({
			error: "turen har redan en bild",
		});
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("ger 404 för en tur som inte finns och anropar inte bildfunktionen", async () => {
		const response = await postPhoto(new Uint8Array(100), {
			queryTourId: String(NONEXISTENT_TOUR_ID),
		});

		expect(response.status).toBe(404);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});

	it("ger 403 för någon annans tur och anropar inte bildfunktionen", async () => {
		const response = await postPhoto(new Uint8Array(100), {
			userId: OTHER_USER_ID,
		});

		expect(response.status).toBe(403);
		expect(requestPhotoProcessing).not.toHaveBeenCalled();
	});
});

describe("Uppladdning med bildfunktionen", () => {
	it("sparar varianterna och svarar med mått och tider, men utan bilddata", async () => {
		vi.mocked(requestPhotoProcessing).mockResolvedValueOnce(
			createProcessedPhoto(PHOTO_KEY),
		);

		const response = await postPhoto(new Uint8Array(100));
		const text = await response.text();
		const body = uploadResponseSchema.parse(JSON.parse(text));

		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			coldStart: true,
			filename: PHOTO_KEY,
			height: 1080,
			instance: "test-instance",
			processingMs: 1234,
			tourId,
			variants: [
				{ height: 144, sizeBytes: 3, width: 256 },
				{ height: 1080, sizeBytes: 3, width: 1920 },
			],
			width: 1920,
		});
		expect(body.apiMs).toBeGreaterThanOrEqual(0);
		expect(text).not.toContain("dataBase64");
		expect(await countPhotoRows()).toBe(1);
		expect((await readdir(uploadDirectory)).sort()).toEqual([
			`${PHOTO_KEY}-1920.avif`,
			`${PHOTO_KEY}-256.avif`,
		]);
		expect(
			await readFile(getPhotoPath(uploadDirectory, PHOTO_KEY, 256)),
		).toEqual(SMALL_VARIANT_BYTES);
	});

	it("skickar bilden och innehållstypen vidare till bildfunktionen", async () => {
		vi.mocked(requestPhotoProcessing).mockResolvedValueOnce(
			createProcessedPhoto(PHOTO_KEY),
		);

		await postPhoto(new Uint8Array([1, 2, 3]));

		expect(requestPhotoProcessing).toHaveBeenCalledWith(
			Buffer.from([1, 2, 3]),
			"image/jpeg",
		);
	});

	it("ger 400 när bildfunktionen avvisar bilden", async () => {
		vi.mocked(requestPhotoProcessing).mockRejectedValueOnce(
			new InvalidPhotoError("bilden är för liten"),
		);

		const response = await postPhoto(new Uint8Array(100));

		expect(response.status).toBe(400);
		expect(errorSchema.parse(await response.json())).toEqual({
			error: "bilden är för liten",
		});
		expect(await readdir(uploadDirectory)).toEqual([]);
	});

	it("ger 502 när bildfunktionen inte går att nå", async () => {
		vi.mocked(requestPhotoProcessing).mockRejectedValueOnce(
			new ImageFunctionError("bildfunktionen kunde inte nås"),
		);
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		const response = await postPhoto(new Uint8Array(100));

		expect(response.status).toBe(502);
		expect(errorSchema.parse(await response.json())).toEqual({
			error: "bildbehandlingen är inte tillgänglig",
		});
		expect(await readdir(uploadDirectory)).toEqual([]);
	});

	it("tar bort filerna igen när bilden inte kan sparas i databasen", async () => {
		vi.mocked(requestPhotoProcessing).mockResolvedValueOnce(
			createProcessedPhoto(PHOTO_KEY),
		);
		vi.spyOn(db, "insert").mockImplementationOnce(() => {
			throw new Error("databasen nere");
		});
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		const response = await postPhoto(new Uint8Array(100));

		expect(response.status).toBe(500);
		expect(await readdir(uploadDirectory)).toEqual([]);
	});

	it("två uppladdningar samtidigt till samma tur ger en bild och ett 409, och bara den sparade bildens filer finns kvar", async () => {
		vi.mocked(requestPhotoProcessing)
			.mockImplementationOnce(async () => {
				await sleep(100);
				return createProcessedPhoto(PHOTO_KEY);
			})
			.mockImplementationOnce(async () => {
				await sleep(100);
				return createProcessedPhoto(SECOND_PHOTO_KEY);
			});

		const responses = await Promise.all([
			postPhoto(new Uint8Array(100)),
			postPhoto(new Uint8Array(100)),
		]);

		expect(responses.map((response) => response.status).sort()).toEqual([
			200, 409,
		]);
		expect(await countPhotoRows()).toBe(1);
		expect(await readdir(uploadDirectory)).toHaveLength(2);
	});
});
