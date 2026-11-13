import { z } from "zod";

// Ett schema per request. Kontrollen körs på servern före varje route,
// oavsett vad klienten har gjort. Gränserna är medvetna val.

export const loginSchema = z.object({
	email: z.email().max(254),
	password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
	displayName: z.string().trim().min(1).max(80),
	email: z.email().max(254),
	password: z.string().min(8, "minst 8 tecken").max(200),
});

export const createTourSchema = z.object({
	distanceM: z.coerce.number().int().min(0).max(1_000_000),
	guideId: z.coerce.number().int().positive().optional().nullable(),
	notes: z.string().max(2000).optional().nullable(),
	startedAt: z.iso.datetime({ offset: true }),
	title: z.string().trim().min(1).max(120),
});

// Bara mått och filnamn skickas, inte bildens bytes.
// Taket 20 000 px per sida stoppar orimliga bilder innan de når bildfunktionen,
// som har en egen gräns på 50 MP.
export const photoUploadSchema = z.object({
	filename: z.string().trim().min(1).max(255),
	height: z.coerce.number().int().min(1).max(20_000),
	tourId: z.coerce.number().int().positive(),
	width: z.coerce.number().int().min(1).max(20_000),
});

// Redaktionens ändring av en guide. Alla fält krävs, så en ändring ersätter hela innehållet
export const guideUpdateSchema = z.object({
	bodyHtml: z.string().max(50_000),
	difficulty: z.enum(["lätt", "medel", "svår"]),
	lengthKm: z.coerce.number().min(0).max(1000),
	published: z.boolean(),
	region: z.string().trim().min(1).max(60),
	title: z.string().trim().min(1).max(120),
});

// Sökordet i query-strängen är också indata
export const searchSchema = z.object({
	q: z.string().trim().max(100).default(""),
});

// Id i adressen ska vara ett positivt heltal
export const idParam = z.coerce.number().int().positive();
