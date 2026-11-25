import { z } from "zod";
import { identifierSchema } from "./common.ts";

// Bara siffror utan inledande nolla. Number() skulle också godta 1e0 och 0x1
const TOUR_ID_PATTERN = /^[1-9]\d*$/;

export const uploadQuerySchema = z.object({
	tourId: z
		.string()
		.regex(TOUR_ID_PATTERN)
		.transform(Number)
		.pipe(identifierSchema),
});
