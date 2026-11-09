import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getPhotoFilename, PHOTO_WIDTHS } from "@utpost/shared";
import type { ImageFunctionVariant } from "./imageFunction.ts";

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

export const savePhotoVariants = async (
	directory: string,
	photoKey: string,
	variants: ImageFunctionVariant[],
): Promise<void> => {
	await mkdir(directory, { recursive: true });

	try {
		for (const variant of variants) {
			await writeFile(
				getPhotoPath(directory, photoKey, variant.width),
				Buffer.from(variant.dataBase64, "base64"),
			);
		}
	} catch (error) {
		await removePhoto(directory, photoKey);
		throw error;
	}
};
