import type { z } from "zod";
import type { tokenPayloadSchema } from "../schemas/authentication.ts";

export type TokenUser = z.infer<typeof tokenPayloadSchema>;
