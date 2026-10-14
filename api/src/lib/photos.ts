import { randomBytes } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
	getPhotoFilename,
	PHOTO_MIN_HEIGHT,
	PHOTO_MIN_WIDTH,
	PHOTO_WIDTHS,
} from "@utpost/shared";
import sharp, { type Metadata, type OutputInfo } from "sharp";

export interface ProcessedPhoto {
	height: number;
	key: string;
	width: number;
}

const MAX_PIXELS = 50_000_000;
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];
const AVIF_QUALITY = 75;

sharp.cache(false);

export class InvalidPhotoError extends Error {}

export const getPhotoPath = (
	directory: string,
	photoKey: string,
	width: number,
): string => {
	return join(directory, getPhotoFilename(photoKey, width));
};

export const removePhoto = async (
	directory: string,
	photoKey: string,
): Promise<void> => {
	for (const width of PHOTO_WIDTHS) {
		await rm(getPhotoPath(directory, photoKey, width), { force: true });
	}
};

const readMetadata = async (imageBuffer: Buffer): Promise<Metadata> => {
	try {
		return await sharp(imageBuffer).metadata();
	} catch {
		throw new InvalidPhotoError("ogiltig bild");
	}
};

const checkMetadata = (metadata: Metadata): void => {
	if (!ALLOWED_FORMATS.includes(metadata.format)) {
		throw new InvalidPhotoError("bildformatet stöds inte");
	}
	if (metadata.width * metadata.height > MAX_PIXELS) {
		throw new InvalidPhotoError("bilden är för stor");
	}
	const { height, width } = metadata.autoOrient;
	if (width < PHOTO_MIN_WIDTH || height < PHOTO_MIN_HEIGHT) {
		throw new InvalidPhotoError(
			`bilden är för liten, den måste minst vara ${PHOTO_MIN_WIDTH} × ${PHOTO_MIN_HEIGHT} px`,
		);
	}
};

const cropToStandardSize = (
	imageBuffer: Buffer,
): Promise<{ data: Buffer; info: OutputInfo }> => {
	return sharp(imageBuffer, { autoOrient: true })
		.resize({
			fit: "cover",
			height: PHOTO_MIN_HEIGHT,
			position: sharp.strategy.attention,
			width: PHOTO_MIN_WIDTH,
		})
		.raw()
		.toBuffer({ resolveWithObject: true });
};

const writeAllWidths = async (
	imageBuffer: Buffer,
	directory: string,
	photoKey: string,
): Promise<void> => {
	try {
		const { data, info } = await cropToStandardSize(imageBuffer);

		for (const width of PHOTO_WIDTHS) {
			await sharp(data, { raw: info })
				.resize({ kernel: "mks2021", width })
				.avif({ quality: AVIF_QUALITY })
				.toFile(getPhotoPath(directory, photoKey, width));
		}
	} catch (error) {
		await removePhoto(directory, photoKey);
		throw error;
	}
};

export const processPhoto = async (
	imageBuffer: Buffer,
	directory: string,
): Promise<ProcessedPhoto> => {
	const metadata = await readMetadata(imageBuffer);
	checkMetadata(metadata);

	await mkdir(directory, { recursive: true });
	const photoKey = randomBytes(16).toString("hex");
	await writeAllWidths(imageBuffer, directory, photoKey);

	return { height: PHOTO_MIN_HEIGHT, key: photoKey, width: PHOTO_MIN_WIDTH };
};
