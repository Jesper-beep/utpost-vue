const REQUEST_DELAY_MS = 200;
const MAX_ATTEMPTS = 5;
const DEFAULT_RESET_SECONDS = 1;

const wait = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));

const getResetSeconds = (response) => {
	const resetSeconds = Number(
		response.headers.get("X-Contentful-RateLimit-Reset"),
	);
	if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
		return resetSeconds;
	}
	return DEFAULT_RESET_SECONDS;
};

// Klienten för Contentfuls Content Management API (api.contentful.com), det som skriver.
// Inställningarna läses ur miljön, och scriptet avslutas om de saknas.
export const createManagementApi = () => {
	const spaceId = process.env["CONTENTFUL_SPACE_ID"];
	const token = process.env["CONTENTFUL_MANAGEMENT_TOKEN"];
	let environment = process.env["CONTENTFUL_ENVIRONMENT"];
	if (!environment) {
		environment = "master";
	}
	if (!spaceId || !token) {
		console.error(
			"Saknar CONTENTFUL_SPACE_ID eller CONTENTFUL_MANAGEMENT_TOKEN i .env.",
		);
		process.exit(1);
	}
	const baseUrl = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}`;

	// Contentful vägrar skriva över en post som har ändrats sedan den lästes (409),
	// så varje ändring måste säga vilken version den utgår från.
	const callApi = async (method, path, { body, contentType, version } = {}) => {
		const headers = {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/vnd.contentful.management.v1+json",
		};
		if (version !== undefined) {
			headers["X-Contentful-Version"] = String(version);
		}
		if (contentType) {
			headers["X-Contentful-Content-Type"] = contentType;
		}
		let requestBody;
		if (body) {
			requestBody = JSON.stringify(body);
		}
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			// Gratisnivån tillåter sju skrivningar i sekunden. Pausen håller oss långt under.
			await wait(REQUEST_DELAY_MS);
			const response = await fetch(baseUrl + path, {
				body: requestBody,
				headers,
				method,
			});
			if (response.status === 429) {
				const resetSeconds = getResetSeconds(response);
				console.log(`429 från Contentful, väntar ${resetSeconds} s`);
				await wait(resetSeconds * 1000);
				continue;
			}
			if (response.status === 404 && method === "GET") {
				return null;
			}
			if (!response.ok) {
				const message = await response.text();
				throw new Error(
					`${method} ${path} -> ${response.status}: ${message.slice(0, 400)}`,
				);
			}
			if (response.status === 204) {
				return null;
			}
			return response.json();
		}
		throw new Error(`${method} ${path}: ${MAX_ATTEMPTS} svar med 429 i rad`);
	};

	let defaultLocale = null;

	const getDefaultLocale = async () => {
		if (!defaultLocale) {
			const locales = await callApi("GET", "/locales");
			defaultLocale = locales.items.find((locale) => locale.default).code;
		}
		return defaultLocale;
	};

	// En innehållstyp måste publiceras innan den går att använda.
	const saveContentType = async (contentTypeId, definition) => {
		const path = `/content_types/${contentTypeId}`;
		const existingType = await callApi("GET", path);
		const savedType = await callApi("PUT", path, {
			body: definition,
			version: existingType?.sys.version,
		});
		await callApi("PUT", `${path}/published`, {
			version: savedType.sys.version,
		});
	};

	// Skapar eller uppdaterar posten, och publicerar den eller tar tillbaka publiceringen.
	// Fälten skrivs för standardspråket.
	const saveEntry = async ({ contentType, entryId, fields, publish }) => {
		const locale = await getDefaultLocale();
		const localizedFields = Object.fromEntries(
			Object.entries(fields).map(([fieldId, value]) => [
				fieldId,
				{ [locale]: value },
			]),
		);
		const path = `/entries/${entryId}`;
		const existingEntry = await callApi("GET", path);
		const savedEntry = await callApi("PUT", path, {
			body: { fields: localizedFields },
			contentType,
			version: existingEntry?.sys.version,
		});
		if (publish) {
			await callApi("PUT", `${path}/published`, {
				version: savedEntry.sys.version,
			});
		} else if (existingEntry?.sys.publishedVersion) {
			await callApi("DELETE", `${path}/published`, {
				version: savedEntry.sys.version,
			});
		}
	};

	return {
		environment,
		getDefaultLocale,
		saveContentType,
		saveEntry,
		spaceId,
	};
};
