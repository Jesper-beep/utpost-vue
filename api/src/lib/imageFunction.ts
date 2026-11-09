import type { ApiError, PhotoVariant } from "@utpost/shared";
import { config } from "../config.js";

export interface ImageFunctionVariant extends PhotoVariant {
	dataBase64: string;
}

export interface ProcessedPhoto {
	coldStart: boolean;
	height: number;
	instance: string;
	key: string;
	processingMs: number;
	variants: ImageFunctionVariant[];
	width: number;
}

const IMAGE_FUNCTION_TIMEOUT_MS = 60_000;
const BAD_REQUEST_STATUS = 400;
const PHOTO_KEY_PATTERN = /^[0-9a-f]{32}$/;

export class InvalidPhotoError extends Error {}

export class ImageFunctionError extends Error {}

const buildHeaders = (contentType: string): Record<string, string> => {
	if (config.imageFunctionKey === "") {
		return { "Content-Type": contentType };
	}

	return {
		"Content-Type": contentType,
		"x-functions-key": config.imageFunctionKey,
	};
};

const sendToFunction = async (
	imageBuffer: Buffer,
	contentType: string,
): Promise<Response> => {
	try {
		return await fetch(config.imageFunctionUrl, {
			body: new Uint8Array(imageBuffer),
			headers: buildHeaders(contentType),
			method: "POST",
			signal: AbortSignal.timeout(IMAGE_FUNCTION_TIMEOUT_MS),
		});
	} catch (error) {
		throw new ImageFunctionError("bildfunktionen kunde inte nås", {
			cause: error,
		});
	}
};

const readErrorMessage = async (response: Response): Promise<string> => {
	try {
		const body = (await response.json()) as ApiError;
		return body.error;
	} catch {
		return `bildfunktionen svarade ${response.status}`;
	}
};

export const requestPhotoProcessing = async (
	imageBuffer: Buffer,
	contentType: string,
): Promise<ProcessedPhoto> => {
	if (config.imageFunctionUrl === "") {
		throw new ImageFunctionError("IMAGE_FUNCTION_URL saknas");
	}

	const response = await sendToFunction(imageBuffer, contentType);

	if (response.status === BAD_REQUEST_STATUS) {
		throw new InvalidPhotoError(await readErrorMessage(response));
	}

	if (!response.ok) {
		throw new ImageFunctionError(`bildfunktionen svarade ${response.status}`);
	}

	const photo = (await response.json()) as ProcessedPhoto;

	if (!PHOTO_KEY_PATTERN.test(photo.key)) {
		throw new ImageFunctionError(
			"bildfunktionen svarade med en ogiltig nyckel",
		);
	}

	return photo;
};
