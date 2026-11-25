import { z } from "zod";

// Största talet i en integer-kolumn i Postgres. Ett större id ger annars ett databasfel.
const MAX_IDENTIFIER = 2_147_483_647;

export const identifierSchema = z.number().int().positive().max(MAX_IDENTIFIER);

// Id i adressen ska vara ett positivt heltal
export const idSchema = z.coerce.number().pipe(identifierSchema);
