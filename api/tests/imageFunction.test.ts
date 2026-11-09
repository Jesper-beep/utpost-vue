import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { config } from "../src/config.js";
import {
	ImageFunctionError,
	InvalidPhotoError,
	requestPhotoProcessing,
} from "../src/lib/imageFunction.ts";

vi.mock("../src/config.js", () => ({
	config: { imageFunctionKey: "", imageFunctionUrl: "" },
}));

const FUNCTION_URL = "http://function.test/api/process-image";
const FUNCTION_KEY = "secret-function-key";
const PHOTO_KEY = "0123456789abcdef0123456789abcdef";
const IMAGE_BYTES = Buffer.from([1, 2, 3]);
const VARIANT_BYTES = Buffer.from([0, 1, 2]);

const functionResponse = {
	coldStart: false,
	height: 1080,
	instance: "test-instance",
	key: PHOTO_KEY,
	processingMs: 500,
	variants: [
		{
			dataBase64: VARIANT_BYTES.toString("base64"),
			height: 144,
			sizeBytes: 3,
			width: 256,
		},
	],
	width: 1920,
};

let fetchSpy: MockInstance<typeof fetch>;

const readSentRequest = (): {
	headers: Record<string, string>;
	body: Buffer;
} => {
	const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];

	return {
		body: Buffer.from(requestInit.body as Uint8Array),
		headers: requestInit.headers as Record<string, string>,
	};
};

beforeEach(() => {
	config.imageFunctionUrl = FUNCTION_URL;
	config.imageFunctionKey = "";
	fetchSpy = vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("requestPhotoProcessing", () => {
	it("skickar bilden till bildfunktionen och ger tillbaka svaret", async () => {
		fetchSpy.mockResolvedValueOnce(Response.json(functionResponse));

		const photo = await requestPhotoProcessing(IMAGE_BYTES, "image/jpeg");

		expect(photo).toEqual(functionResponse);
		expect(fetchSpy.mock.calls[0]?.[0]).toBe(FUNCTION_URL);
		expect(readSentRequest().body).toEqual(IMAGE_BYTES);
		expect(readSentRequest().headers).toEqual({ "Content-Type": "image/jpeg" });
	});

	it("skickar nyckeln i x-functions-key när den är satt", async () => {
		config.imageFunctionKey = FUNCTION_KEY;
		fetchSpy.mockResolvedValueOnce(Response.json(functionResponse));

		await requestPhotoProcessing(IMAGE_BYTES, "image/jpeg");

		expect(readSentRequest().headers["x-functions-key"]).toBe(FUNCTION_KEY);
	});

	it("avvisar bilden med bildfunktionens meddelande när den svarar 400", async () => {
		fetchSpy.mockResolvedValueOnce(
			Response.json({ error: "bilden är för liten" }, { status: 400 }),
		);

		const rejection = requestPhotoProcessing(IMAGE_BYTES, "image/jpeg");

		await expect(rejection).rejects.toBeInstanceOf(InvalidPhotoError);
		await expect(rejection).rejects.toThrow("bilden är för liten");
	});

	it.each([401, 500, 503])(
		"misslyckas när bildfunktionen svarar %i",
		async (status) => {
			fetchSpy.mockResolvedValueOnce(new Response("fel", { status }));

			await expect(
				requestPhotoProcessing(IMAGE_BYTES, "image/jpeg"),
			).rejects.toBeInstanceOf(ImageFunctionError);
		},
	);

	it("misslyckas när bildfunktionen inte går att nå", async () => {
		fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));

		await expect(
			requestPhotoProcessing(IMAGE_BYTES, "image/jpeg"),
		).rejects.toBeInstanceOf(ImageFunctionError);
	});

	it("misslyckas utan att anropa nätet när adressen saknas", async () => {
		config.imageFunctionUrl = "";

		await expect(
			requestPhotoProcessing(IMAGE_BYTES, "image/jpeg"),
		).rejects.toBeInstanceOf(ImageFunctionError);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("avvisar ett svar med en nyckel som kan peka utanför uppladdningsmappen", async () => {
		fetchSpy.mockResolvedValueOnce(
			Response.json({ ...functionResponse, key: "../../etc/passwd" }),
		);

		await expect(
			requestPhotoProcessing(IMAGE_BYTES, "image/jpeg"),
		).rejects.toBeInstanceOf(ImageFunctionError);
	});
});
