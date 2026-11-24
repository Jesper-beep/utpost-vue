import pg from "pg";
import { htmlToRichText } from "./lib/html-to-rich-text.mjs";
import { createManagementApi } from "./lib/management-api.mjs";

const { environment, getDefaultLocale, saveContentType, saveEntry, spaceId } =
	createManagementApi();

const postgresUrl = process.env["POSTGRES_URL"];
if (!postgresUrl) {
	console.error("Saknar POSTGRES_URL i .env.");
	process.exit(1);
}

// Fälten säger vad innehållet är. Region, svårighetsgrad, längd och bild stannar i Postgres,
// eftersom appen söker, sorterar och kopplar turer på dem. Rubriken finns bara så att redaktören
// ser vilken guide det är, och appen läser den inte.
const guideContentType = {
	description:
		"Texten till en guide. Resten av guiden bor i databasen och hittas med guidens id.",
	displayField: "rubrik",
	fields: [
		{
			id: "rubrik",
			localized: false,
			name: "Rubrik",
			required: true,
			type: "Symbol",
			validations: [{ size: { max: 120 } }],
		},
		{
			id: "guideId",
			localized: false,
			name: "Guidens id i databasen",
			required: true,
			type: "Integer",
			validations: [{ unique: true }],
		},
		{
			id: "text",
			localized: false,
			name: "Text",
			required: false,
			type: "RichText",
			validations: [
				{
					enabledMarks: ["bold", "italic"],
					message: "Bara fet och kursiv text",
				},
				{
					enabledNodeTypes: [
						"heading-2",
						"heading-3",
						"unordered-list",
						"ordered-list",
						"hyperlink",
					],
					message: "Bara rubriker, listor och länkar",
				},
			],
		},
	],
	name: "Guide",
};

console.log(
	`Space ${spaceId}, miljö ${environment}, språk ${await getDefaultLocale()}`,
);

await saveContentType("guide", guideContentType);
console.log("Innehållstypen Guide klar");

const database = new pg.Client({ connectionString: postgresUrl });
await database.connect();
let guides;
try {
	const result = await database.query(
		"select id, title, body_html, published from guides order by id",
	);
	guides = result.rows;
} finally {
	await database.end();
}

// En guide som inte är publicerad i databasen blir ett utkast i Contentful.
let publishedCount = 0;
for (const guide of guides) {
	const entryId = `utpost-guide-${guide.id}`;
	await saveEntry({
		contentType: "guide",
		entryId,
		fields: {
			guideId: guide.id,
			rubrik: guide.title,
			text: htmlToRichText(guide.body_html),
		},
		publish: guide.published,
	});
	if (guide.published) {
		publishedCount += 1;
	}
	console.log(`${entryId}: ${guide.title}`);
}

console.log(
	`Klart: ${publishedCount} publicerade och ${guides.length - publishedCount} utkast av ${guides.length} guider.`,
);
