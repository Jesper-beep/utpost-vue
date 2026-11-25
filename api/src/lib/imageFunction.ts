import { z } from "zod";
import { config } from "../config/env.ts";

const IMAGE_FUNCTION_TIMEOUT_MS = 60_000;
const BAD_REQUEST_STATUS = 400;
const PHOTO_KEY_PATTERN = /^[0-9a-f]{32}$/;

const imageFunctionVariantSchema = z.object({
	dataBase64: z.string(),
	height: z.number(),
	sizeBytes: z.number(),
	width: z.number(),
});

const processedPhotoSchema = z.object({
	coldStart: z.boolean(),
	height: z.number(),
	instance: z.string(),
	key: z.string().regex(PHOTO_KEY_PATTERN),
	processingMs: z.number(),
	variants: z.array(imageFunctionVariantSchema),
	width: z.number(),
});

const errorBodySchema = z.object({ error: z.string() });

export type ImageFunctionVariant = z.infer<typeof imageFunctionVariantSchema>;
export type ProcessedPhoto = z.infer<typeof processedPhotoSchema>;

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
		const body = errorBodySchema.parse(await response.json());
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

	const parsedPhoto = processedPhotoSchema.safeParse(await response.json());
	if (parsedPhoto.success) {
		return parsedPhoto.data;
	} else {
		throw new ImageFunctionError(
			"bildfunktionen svarade med ett oväntat svar",
			{
				cause: parsedPhoto.error,
			},
		);
	}
};
