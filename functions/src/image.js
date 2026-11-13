import { randomBytes } from "node:crypto";
import sharp from "sharp";
import {
	PHOTO_MIN_HEIGHT,
	PHOTO_MIN_WIDTH,
	PHOTO_WIDTHS,
} from "../../shared/src/index.ts";

const MAX_PIXELS = 50_000_000;
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];
const AVIF_QUALITY = 75;
const PHOTO_KEY_BYTES = 16;

sharp.cache(false);

export class InvalidPhotoError extends Error {}

// Bara headern läses här, så gränsen för pixlar behövs inte.
// checkMetadata ger det tydliga felet "bilden är för stor".
const readMetadata = async (imageBuffer) => {
	try {
		return await sharp(imageBuffer, { limitInputPixels: false }).metadata();
	} catch {
		throw new InvalidPhotoError("ogiltig bild");
	}
};

const checkMetadata = (metadata) => {
	if (!ALLOWED_FORMATS.includes(metadata.format)) {
		throw new InvalidPhotoError("bildformatet stöds inte");
	}
	if (metadata.width * metadata.height > MAX_PIXELS) {
		throw new InvalidPhotoError("bilden är för stor");
	}
	const { height, width } = metadata.autoOrient;
	if (width < PHOTO_MIN_WIDTH || height < PHOTO_MIN_HEIGHT) {
		throw new InvalidPhotoError(
			`bilden är för liten, den måste minst vara ${PHOTO_MIN_WIDTH} x ${PHOTO_MIN_HEIGHT} px`,
		);
	}
};

// Sharp vägrar själv att avkoda en bild över gränsen, även om checkMetadata skulle hoppas över
const cropToStandardSize = (imageBuffer) => {
	return sharp(imageBuffer, { autoOrient: true, limitInputPixels: MAX_PIXELS })
		.resize({
			fit: "cover",
			height: PHOTO_MIN_HEIGHT,
			position: sharp.strategy.attention,
			width: PHOTO_MIN_WIDTH,
		})
		.raw()
		.toBuffer({ resolveWithObject: true });
};

const createVariant = async (croppedPixels, croppedInfo, width) => {
	const { data, info } = await sharp(croppedPixels, { raw: croppedInfo })
		.resize({ kernel: "mks2021", width })
		.avif({ quality: AVIF_QUALITY })
		.toBuffer({ resolveWithObject: true });

	return {
		dataBase64: data.toString("base64"),
		height: info.height,
		sizeBytes: info.size,
		width: info.width,
	};
};

const createAllVariants = async (imageBuffer) => {
	const { data, info } = await cropToStandardSize(imageBuffer);
	const variants = [];

	for (const width of PHOTO_WIDTHS) {
		variants.push(await createVariant(data, info, width));
	}

	return variants;
};

export const processPhoto = async (imageBuffer) => {
	const metadata = await readMetadata(imageBuffer);
	checkMetadata(metadata);

	return {
		height: PHOTO_MIN_HEIGHT,
		key: randomBytes(PHOTO_KEY_BYTES).toString("hex"),
		variants: await createAllVariants(imageBuffer),
		width: PHOTO_MIN_WIDTH,
	};
};
