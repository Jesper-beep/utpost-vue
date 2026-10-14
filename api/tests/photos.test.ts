import { mkdtemp, rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PHOTO_WIDTHS } from "@utpost/shared";
import express from "express";
import sharp from "sharp";
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
import { sign } from "../src/lib/auth.js";
import { getPhotoPath, processPhoto } from "../src/lib/photos.ts";
import { photosRouter } from "../src/routes/photos.ts";

vi.mock("../src/config.js", () => ({
	config: { jwtSecret: "test-secret", uploadDir: "" },
}));
vi.mock("../src/db/client.js", () => ({ pool: { query: vi.fn() } }));

let uploadDirectory: string;

const createTestImage = (
	width: number,
	height: number,
	format: "jpeg" | "png" = "jpeg",
): Promise<Buffer> => {
	return sharp({
		create: { background: "#4a7", channels: 3, height, width },
	})
		.toFormat(format)
		.toBuffer();
};

beforeEach(async () => {
	uploadDirectory = await mkdtemp(join(tmpdir(), "utpost-photos-"));
});

afterEach(async () => {
	await rm(uploadDirectory, { force: true, recursive: true });
});

describe("Bildbearbetning", () => {
	it("sparar bilden som 16:9 i alla storlekar", async () => {
		const photo = await processPhoto(
			await createTestImage(5000, 2500),
			uploadDirectory,
		);

		expect(photo).toMatchObject({ height: 1080, width: 1920 });
		for (const width of PHOTO_WIDTHS) {
			const savedFile = await sharp(
				getPhotoPath(uploadDirectory, photo.key, width),
			).metadata();
			expect(savedFile.width).toBe(width);
			expect(savedFile.height).toBe(Math.round((width * 9) / 16));
		}
	});

	it("avvisar en bild som är större än 50 MP", async () => {
		const imageWith60MillionPixels = await createTestImage(10_000, 6000, "png");

		await expect(
			processPhoto(imageWith60MillionPixels, uploadDirectory),
		).rejects.toThrow("bilden är för stor");
	});
});

describe("Uppladdning till API:et", () => {
	let testServer: Server;
	let photosUrl: string;

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

	it("avvisar en bild som är större än 10 MB", async () => {
		const loginToken = sign({
			email: "test@example.com",
			id: 1,
			role: "member",
		});

		const response = await fetch(`${photosUrl}?tourId=1`, {
			body: new Uint8Array(11 * 1024 * 1024),
			headers: {
				Authorization: `Bearer ${loginToken}`,
				"Content-Type": "image/jpeg",
			},
			method: "POST",
		});

		expect(response.status).toBe(413);
	});
});
