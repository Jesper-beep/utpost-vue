import { createManagementApi } from "./lib/management-api.mjs";

const { environment, getDefaultLocale, saveContentType, saveEntry, spaceId } =
	createManagementApi();

// Fälten säger vad en notis är. Nivån är ett val mellan två värden och inte en färg.
// Texten får innehålla fet, kursiv och länkar, men inga rubriker, bilder eller tabeller,
// så att redaktören inte kan förstöra layouten.
const noticeContentType = {
	description:
		"En notis från redaktionen: driftinformation och varningar till besökarna.",
	displayField: "rubrik",
	fields: [
		{
			id: "rubrik",
			localized: false,
			name: "Rubrik",
			required: true,
			type: "Symbol",
			validations: [{ size: { max: 80 } }],
		},
		{
			id: "text",
			localized: false,
			name: "Text",
			required: true,
			type: "RichText",
			validations: [
				{
					enabledMarks: ["bold", "italic"],
					message: "Bara fet och kursiv text",
				},
				{ enabledNodeTypes: ["hyperlink"], message: "Bara stycken och länkar" },
			],
		},
		{
			id: "niva",
			localized: false,
			name: "Nivå",
			required: true,
			type: "Symbol",
			validations: [{ in: ["info", "varning"] }],
		},
		{
			id: "guideSlug",
			localized: false,
			name: "Gäller guide (slug)",
			required: false,
			type: "Symbol",
			validations: [
				{
					message: "Guidens slug, som i adressen: norra-leden-7",
					regexp: { pattern: "^[a-z0-9-]+$" },
				},
			],
		},
	],
	name: "Notis",
};

const createText = (value, marks = []) => ({
	data: {},
	marks: marks.map((type) => ({ type })),
	nodeType: "text",
	value,
});
const createParagraph = (...content) => ({
	content,
	data: {},
	nodeType: "paragraph",
});
const createDocument = (...content) => ({
	content,
	data: {},
	nodeType: "document",
});

// Två notiser publiceras. Den tredje lämnas som utkast och syns bara i förhandsgranskningen.
const notices = [
	{
		fields: {
			niva: "varning",
			rubrik: "Storforsbron är avstängd",
			text: createDocument(
				createParagraph(
					createText("Bron över Storforsen lagas till och med "),
					createText("30 november", ["bold"]),
					createText("."),
				),
				createParagraph(createText("Räkna med en omväg på tre kilometer.")),
			),
		},
		id: "utpost-notis-1",
		publish: true,
	},
	{
		fields: {
			niva: "info",
			rubrik: "Vinterguiderna är på väg",
			text: createDocument(
				createParagraph(
					createText(
						"Redaktionen går igenom lederna inför vintern. Uppdaterade guider kommer i december.",
					),
				),
			),
		},
		id: "utpost-notis-2",
		publish: true,
	},
	{
		fields: {
			niva: "info",
			rubrik: "Ny led till våren",
			text: createDocument(
				createParagraph(
					createText(
						"Vi öppnar en ny led i Jämtland i maj. Mer information kommer.",
					),
				),
			),
		},
		id: "utpost-notis-3",
		publish: false,
	},
];

console.log(
	`Space ${spaceId}, miljö ${environment}, språk ${await getDefaultLocale()}`,
);

await saveContentType("notis", noticeContentType);
console.log(
	`Innehållstypen Notis klar (${noticeContentType.fields.length} fält)`,
);

for (const notice of notices) {
	await saveEntry({
		contentType: "notis",
		entryId: notice.id,
		fields: notice.fields,
		publish: notice.publish,
	});
	let state = "utkast";
	if (notice.publish) {
		state = "publicerad";
	}
	console.log(`${state}: ${notice.fields.rubrik}`);
}

console.log(`
Nu behöver appen de två nycklarna som läser. Skapa dem under Settings > API keys > Add API key och lägg dem i .env:
  CONTENTFUL_DELIVERY_TOKEN = Content Delivery API - access token (bara publicerat)
  CONTENTFUL_PREVIEW_TOKEN = Content Preview API - access token (även utkast)
Starta sedan om API:et.`);
