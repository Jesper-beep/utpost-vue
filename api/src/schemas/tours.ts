import { z } from "zod";
import { idSchema } from "./common.ts";

export const createTourSchema = z.object({
	distanceM: z.number().int().min(0).max(1_000_000),
	guideId: idSchema.nullish().default(null),
	notes: z.string().max(2000).nullish().default(null),
	startedAt: z.iso.datetime({ offset: true }).pipe(z.coerce.date()),
	title: z.string().trim().min(1).max(120),
});

export type CreateTourInput = z.infer<typeof createTourSchema>;
