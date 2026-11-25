import { fileURLToPath } from "node:url";
import { DIFFICULTIES, type UserRole } from "@utpost/shared";
import { desc, sql } from "drizzle-orm";
import { hashPassword } from "../lib/password.ts";
import { runMigrations } from "./migrate.ts";
import { db, pool } from "./postgres.ts";
import { guides, tourLogs, tours, users } from "./schema/index.ts";

const REGIONS = [
	"Jämtland",
	"Dalarna",
	"Lappland",
	"Bohuslän",
	"Småland",
	"Södermanland",
	"Härjedalen",
	"Skåne",
];
const FIRST_NAMES = [
	"Anna",
	"Erik",
	"Sara",
	"Johan",
	"Maria",
	"Ali",
	"Nina",
	"Oskar",
	"Lisa",
	"Pontus",
	"Ida",
	"Hassan",
];
const LAST_NAMES = [
	"Berg",
	"Lind",
	"Ek",
	"Nord",
	"Sund",
	"Holm",
	"Falk",
	"Ahlgren",
	"Osman",
	"Waller",
	"Ryd",
	"Kvist",
];
const GUIDE_TITLE_PREFIXES = ["Stora", "Lilla", "Norra", "Södra", "Gamla"];
const GUIDE_TITLE_NAMES = [
	"Björnleden",
	"Hällstigen",
	"Sjörundan",
	"Myrleden",
	"Klippstigen",
];
const TEST_PASSWORD = "hemligt123";
const EDITOR_EMAIL = "redaktor@utpost.se";
const MEMBER_EMAIL = "medlem@utpost.se";
const USER_COUNT = 12;
const GUIDE_COUNT = 40;
const TOUR_COUNT = 200;
const MILLISECONDS_PER_DAY = 86_400_000;
const LOG_INTERVAL_MILLISECONDS = 300_000;

const randomInteger = (limit: number): number => {
	return Math.floor(Math.random() * limit);
};

const pickRandom = <T>(items: readonly T[]): T => {
	const item = items[randomInteger(items.length)];
	if (item === undefined) {
		throw new Error("Kan inte välja ur en tom lista");
	} else {
		return item;
	}
};

const createEmail = (index: number, name: string): string => {
	if (index === 0) {
		return EDITOR_EMAIL;
	}
	if (index === 1) {
		return MEMBER_EMAIL;
	}
	return `${name.toLowerCase().replace(" ", ".")}${index}@example.com`;
};

const createSlug = (title: string): string => {
	return title
		.toLowerCase()
		.replace(/[åä]/g, "a")
		.replace(/ö/g, "o")
		.replace(/\s+/g, "-");
};

const createBodyHtml = (title: string, region: string): string => {
	return `
<h2>Om ${title}</h2>
<p>En av de mest omtyckta lederna i ${region}. Passar bra från maj till oktober.</p>
<h3>Så tar du dig hit</h3>
<p>Buss ${100 + randomInteger(400)} från centralorten, cirka ${20 + randomInteger(60)} minuter. Parkering finns vid leden.</p>
<h3>Bra att veta</h3>
<ul><li>Vindskydd vid halva sträckan</li><li>Ingen service utmed leden</li><li>Mobiltäckning delvis</li></ul>
<p><em>Senast granskad av redaktionen.</em></p>`.trim();
};

const insertUsers = async (): Promise<number[]> => {
	const passwordHash = await hashPassword(TEST_PASSWORD);
	const rows: (typeof users.$inferInsert)[] = [];

	for (let i = 0; i < USER_COUNT; i++) {
		const firstName = pickRandom(FIRST_NAMES);
		const lastName = pickRandom(LAST_NAMES);
		const displayName = `${firstName}${lastName}${i}`.toLowerCase();
		let role: UserRole;
		if (i === 0) {
			role = "editor";
		} else {
			role = "member";
		}
		rows.push({
			displayName,
			email: createEmail(i, `${firstName} ${lastName}`),
			firstName,
			lastName,
			passwordHash,
			role,
		});
	}

	const inserted = await db.insert(users).values(rows).returning();
	return inserted.map((user) => user.id);
};

const insertGuides = async (authorId: number): Promise<number[]> => {
	const rows: (typeof guides.$inferInsert)[] = [];

	for (let i = 0; i < GUIDE_COUNT; i++) {
		const region = pickRandom(REGIONS);
		const title = `${pickRandom(GUIDE_TITLE_PREFIXES)} ${pickRandom(GUIDE_TITLE_NAMES)} ${i + 1}`;
		rows.push({
			authorId,
			bodyHtml: createBodyHtml(title, region),
			difficulty: pickRandom(DIFFICULTIES),
			heroImage: `hero-${i + 1}.jpg`,
			lengthKm: Math.round((3 + Math.random() * 25) * 10) / 10,
			published: i % 9 !== 0,
			region,
			slug: createSlug(title),
			title,
		});
	}

	const inserted = await db.insert(guides).values(rows).returning();
	return inserted.map((guide) => guide.id);
};

// Returnerar antalet loggpunkter som skapades.
const insertTourWithLogs = async (
	index: number,
	userIds: number[],
	guideIds: number[],
): Promise<number> => {
	const startedAt = new Date(
		Date.now() - randomInteger(500) * MILLISECONDS_PER_DAY,
	);

	let guideId: number | null;
	if (Math.random() > 0.25) {
		guideId = pickRandom(guideIds);
	} else {
		guideId = null;
	}

	let notes: string | null;
	if (Math.random() > 0.6) {
		notes = "Blött väder, mycket folk vid rastplatsen.";
	} else {
		notes = null;
	}

	const [tour] = await db
		.insert(tours)
		.values({
			distanceM: 2000 + randomInteger(30_000),
			guideId,
			notes,
			startedAt,
			title: `Tur ${index + 1}`,
			userId: pickRandom(userIds),
		})
		.returning();
	if (tour === undefined) {
		throw new Error("Turen sparades inte");
	}

	const pointCount = 20 + randomInteger(20);
	const logRows: (typeof tourLogs.$inferInsert)[] = [];
	for (let point = 0; point < pointCount; point++) {
		logRows.push({
			elevationM: 100 + randomInteger(900),
			heartRate: 90 + randomInteger(70),
			lat: 58 + Math.random() * 10,
			lon: 12 + Math.random() * 8,
			recordedAt: new Date(
				startedAt.getTime() + point * LOG_INTERVAL_MILLISECONDS,
			),
			tourId: tour.id,
		});
	}
	await db.insert(tourLogs).values(logRows);

	return pointCount;
};

export const seed = async (): Promise<void> => {
	await runMigrations();
	await db.execute(
		sql`truncate photos, tour_logs, tours, guides, users restart identity`,
	);

	const userIds = await insertUsers();
	const [editorId] = userIds;
	if (editorId === undefined) {
		throw new Error("Ingen redaktör skapades");
	}
	const guideIds = await insertGuides(editorId);

	let logCount = 0;
	for (let i = 0; i < TOUR_COUNT; i++) {
		logCount += await insertTourWithLogs(i, userIds, guideIds);
	}

	console.log(
		`Seed klar: ${USER_COUNT} användare, ${GUIDE_COUNT} guider, ${TOUR_COUNT} turer, ${logCount} loggpunkter.`,
	);

	const newestTour = await db.query.tours.findFirst({
		orderBy: desc(tours.startedAt),
		with: { user: true },
	});
	if (newestTour === undefined) {
		throw new Error("Hittade ingen tur att visa testinloggning för");
	}
	console.log(
		`Testinloggning: ${newestTour.user.email} / ${TEST_PASSWORD}, tur ${newestTour.id}`,
	);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		await seed();
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
}
