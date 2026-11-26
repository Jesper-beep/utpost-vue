import jwt from "jsonwebtoken";
import { config } from "../config/env.ts";
import { tokenPayloadSchema } from "../schemas/authentication.ts";
import type { TokenUser } from "../types/authentication.ts";

const BEARER_PREFIX = "Bearer ";

// Token gäller i en timme. Om den läcker ska den snart vara värdelös.
export const sign = (user: TokenUser): string => {
	return jwt.sign(
		{ email: user.email, id: user.id, role: user.role },
		config.jwtSecret,
		{ algorithm: "HS256", expiresIn: "1h" },
	);
};

// Bara HS256 godtas, så att en token med "alg: none" inte går igenom.
export const verifyToken = (token: string): TokenUser => {
	const payload = jwt.verify(token, config.jwtSecret, {
		algorithms: ["HS256"],
	});
	return tokenPayloadSchema.parse(payload);
};

// Plockar ut token ur headern "Authorization: Bearer <token>".
export const readBearerToken = (
	header: string | null | undefined,
): string | null => {
	if (header === null || header === undefined) {
		return null;
	}
	if (header.startsWith(BEARER_PREFIX)) {
		return header.slice(BEARER_PREFIX.length);
	} else {
		return null;
	}
};
