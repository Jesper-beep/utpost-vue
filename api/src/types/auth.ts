import type { z } from "zod";
import type { tokenPayloadSchema } from "../schemas/auth.ts";

export type TokenUser = z.infer<typeof tokenPayloadSchema>;
