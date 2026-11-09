// Mäter om API:et svarar medan många bilder laddas upp samtidigt.
//
// Användning (API:et ska köra, och databasen vara seedad):
//   node scripts/mat-upload.mjs --image <bildfil> --email <epost> --tour <tur-id>
//
// Seeden skriver ut en inloggning som passar, på formen
// "Testinloggning: <epost> / hemligt123, tur <tur-id>".
// Bilden ska vara minst 1920 × 1080 px och högst 10 MB.
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parseArgs } from "node:util";

const DEFAULT_API_URL = "http://localhost:4000";
const DEFAULT_PASSWORD = "hemligt123";
const DEFAULT_UPLOAD_COUNT = "10";
const DEFAULT_HEALTH_INTERVAL_MS = "100";
const HEALTH_TIMEOUT_MS = 60_000;
const CONTENT_TYPES = {
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
};

const { values: options } = parseArgs({
	options: {
		api: { default: DEFAULT_API_URL, type: "string" },
		email: { type: "string" },
		image: { type: "string" },
		interval: { default: DEFAULT_HEALTH_INTERVAL_MS, type: "string" },
		password: { default: DEFAULT_PASSWORD, type: "string" },
		tour: { type: "string" },
		uploads: { default: DEFAULT_UPLOAD_COUNT, type: "string" },
	},
});

const exitWithError = (message) => {
	console.error(message);
	process.exit(1);
};

const requireOption = (name) => {
	const value = options[name];

	if (!value) {
		exitWithError(
			`Flaggan --${name} saknas. Se överst i scripts/mat-upload.mjs.`,
		);
	}

	return value;
};

const roundMs = (milliseconds) => {
	return Math.round(milliseconds);
};

const findLargest = (numbers) => {
	return Math.max(...numbers);
};

const checkHealth = async (apiUrl) => {
	try {
		const response = await fetch(`${apiUrl}/api/health`);

		if (!response.ok) {
			exitWithError(
				`/api/health svarade ${response.status}. Är databaserna igång?`,
			);
		}
	} catch {
		exitWithError(`API:et svarar inte på ${apiUrl}. Starta det först.`);
	}
};

const login = async (apiUrl, email, password) => {
	const response = await fetch(`${apiUrl}/api/auth/login`, {
		body: JSON.stringify({ email, password }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});

	if (!response.ok) {
		exitWithError(`Inloggningen misslyckades (${response.status}).`);
	}

	const { token } = await response.json();
	return token;
};

const readImage = async (imagePath) => {
	const contentType = CONTENT_TYPES[extname(imagePath).toLowerCase()];

	if (contentType === undefined) {
		exitWithError("Bilden måste vara .jpg, .jpeg, .png eller .webp.");
	}

	return { contentType, imageBuffer: await readFile(imagePath) };
};

const uploadImage = async ({
	apiUrl,
	contentType,
	imageBuffer,
	token,
	tourId,
}) => {
	const startedAt = performance.now();

	try {
		const response = await fetch(`${apiUrl}/api/photos?tourId=${tourId}`, {
			body: imageBuffer,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": contentType,
			},
			method: "POST",
		});
		const body = await response.json().catch(() => null);

		return {
			body,
			durationMs: performance.now() - startedAt,
			isOk: response.ok,
			status: response.status,
		};
	} catch (error) {
		return {
			body: { error: error.message },
			durationMs: performance.now() - startedAt,
			isOk: false,
			status: 0,
		};
	}
};

const timeHealthRequest = async (apiUrl) => {
	const startedAt = performance.now();

	try {
		await fetch(`${apiUrl}/api/health`, {
			signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
		});
		return performance.now() - startedAt;
	} catch {
		return Number.NaN;
	}
};

const startHealthSampling = (apiUrl, intervalMs) => {
	const pendingSamples = [];
	const timer = setInterval(() => {
		pendingSamples.push(timeHealthRequest(apiUrl));
	}, intervalMs);

	return async () => {
		clearInterval(timer);
		return await Promise.all(pendingSamples);
	};
};

const printResult = (uploads, healthSamples, totalMs) => {
	const failedUploads = uploads.filter((upload) => !upload.isOk);
	const finishedHealthSamples = healthSamples.filter(Number.isFinite);
	const unfinishedHealthCount =
		healthSamples.length - finishedHealthSamples.length;
	const coldStartCount = uploads.filter(
		(upload) => upload.body?.coldStart,
	).length;

	console.log(
		`uppladdningar: ${uploads.length}, misslyckade: ${failedUploads.length}`,
	);
	console.log(
		`uppladdning max: ${roundMs(findLargest(uploads.map((upload) => upload.durationMs)))} ms`,
	);
	console.log(
		`health: ${healthSamples.length} mätningar, utan svar: ${unfinishedHealthCount}`,
	);
	if (finishedHealthSamples.length === 0) {
		console.log("health max: inga svar, mätningen är ogiltig");
	} else {
		console.log(
			`health max: ${roundMs(findLargest(finishedHealthSamples))} ms`,
		);
	}
	console.log(`kallstarter i svaren: ${coldStartCount}`);
	console.log(`totalt: ${roundMs(totalMs)} ms`);

	if (failedUploads.length > 0) {
		console.log(
			`första felet: ${failedUploads[0].status} ${JSON.stringify(failedUploads[0].body)}`,
		);
	}
};

const apiUrl = options.api;
const uploadCount = Number(options.uploads);
const healthIntervalMs = Number(options.interval);
const tourId = requireOption("tour");
const email = requireOption("email");
const imagePath = requireOption("image");

await checkHealth(apiUrl);
const token = await login(apiUrl, email, options.password);
const { contentType, imageBuffer } = await readImage(imagePath);

console.log(
	`Skickar ${uploadCount} uppladdningar samtidigt till ${apiUrl} ...`,
);
const startedAt = performance.now();
const stopHealthSampling = startHealthSampling(apiUrl, healthIntervalMs);
const uploads = await Promise.all(
	Array.from({ length: uploadCount }, () =>
		uploadImage({ apiUrl, contentType, imageBuffer, token, tourId }),
	),
);
const healthSamples = await stopHealthSampling();

printResult(uploads, healthSamples, performance.now() - startedAt);
