import { DIFFICULTIES } from "@utpost/shared";
import { z } from "zod";

// Redaktionens ändring av en guide. Alla fält krävs, så en ändring ersätter hela innehållet
export const guideUpdateSchema = z.object({
	bodyHtml: z.string().max(50_000),
	difficulty: z.enum(DIFFICULTIES),
	lengthKm: z.number().min(0).max(1000),
	published: z.boolean(),
	region: z.string().trim().min(1).max(60),
	title: z.string().trim().min(1).max(120),
});

// Sökordet i query-strängen är också indata
export const searchSchema = z.object({
	q: z.string().trim().max(100).default(""),
});

export type GuideUpdate = z.infer<typeof guideUpdateSchema>;
