import {
	type ApiError,
	getPhotoFilename,
	PHOTO_MAX_UPLOAD_MB,
	PHOTO_WIDTHS,
	type Photo,
} from "@utpost/shared";
import { API_URL } from "../config.js";

export const DEFAULT_IMAGE_WIDTH = 1080;

export const buildPhotoUrl = (filename: string, width: number): string => {
	return `/uploads/${getPhotoFilename(filename, width)}`;
};

export const buildPhotoSrcset = (filename: string): string => {
	return PHOTO_WIDTHS.map(
		(width) => `${buildPhotoUrl(filename, width)} ${width}w`,
	).join(", ");
};

export const uploadPhoto = async (
	token: string,
	tourId: number,
	file: File,
): Promise<Photo | ApiError> => {
	try {
		const response = await fetch(`${API_URL}/photos?tourId=${tourId}`, {
			body: file,
			headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type },
			method: "POST",
		});

		if (response.status === 413) {
			return {
				error: `Bilden är för stor, den får max vara ${PHOTO_MAX_UPLOAD_MB} MB.`,
			};
		} else {
			return await response.json();
		}
	} catch {
		return { error: "Något gick fel. Försök igen senare." };
	}
};
