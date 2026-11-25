import { USER_ROLES } from "@utpost/shared";
import { z } from "zod";

export const tokenPayloadSchema = z.object({
	email: z.string(),
	id: z.number().int().positive(),
	role: z.enum(USER_ROLES),
});
