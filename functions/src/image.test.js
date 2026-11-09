import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PHOTO_WIDTHS } from "../../shared/src/index.ts";
import { processPhoto } from "./image.js";

const createTestImage = (width, height, format = "jpeg") => {
	return sharp({
		create: { background: "#4a7", channels: 3, height, width },
	})
		.toFormat(format)
		.toBuffer();
};

const readVariantMetadata = (variant) => {
	return sharp(Buffer.from(variant.dataBase64, "base64")).metadata();
};

describe("Bildbearbetning", () => {
	it("skapar bilden som 16:9 i alla storlekar", async () => {
		const photo = await processPhoto(await createTestImage(5000, 2500));

		expect(photo).toMatchObject({ height: 1080, width: 1920 });
		expect(photo.variants.map((variant) => variant.width)).toEqual(
			PHOTO_WIDTHS,
		);

		for (const variant of photo.variants) {
			const metadata = await readVariantMetadata(variant);
			expect(metadata.format).toBe("heif");
			expect(metadata.width).toBe(variant.width);
			expect(metadata.height).toBe(Math.round((variant.width * 9) / 16));
		}
	});

	it("godkänner en bild som är lagrad stående men ska visas liggande", async () => {
		const sidewaysImage = await sharp({
			create: { background: "#4a7", channels: 3, height: 2400, width: 1500 },
		})
			.jpeg()
			.withMetadata({ orientation: 6 })
			.toBuffer();

		const photo = await processPhoto(sidewaysImage);

		expect(photo).toMatchObject({ height: 1080, width: 1920 });
	});

	it("avvisar en bild som är större än 50 MP", async () => {
		const imageWith60MillionPixels = await createTestImage(10_000, 6000, "png");

		await expect(processPhoto(imageWith60MillionPixels)).rejects.toThrow(
			"bilden är för stor",
		);
	});

	it("avvisar en bild som är mindre än 1920 × 1080", async () => {
		const smallImage = await createTestImage(1600, 900);

		await expect(processPhoto(smallImage)).rejects.toThrow(
			"bilden är för liten",
		);
	});

	it("avvisar ett bildformat som inte stöds", async () => {
		const gifImage = await createTestImage(2000, 1200, "gif");

		await expect(processPhoto(gifImage)).rejects.toThrow(
			"bildformatet stöds inte",
		);
	});

	it("avvisar data som inte är en bild", async () => {
		await expect(processPhoto(Buffer.from("inte en bild"))).rejects.toThrow(
			"ogiltig bild",
		);
	});
});
