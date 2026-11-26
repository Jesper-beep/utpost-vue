import { AUTHENTICATION_MESSAGES } from "@utpost/shared";
import { rateLimit } from "express-rate-limit";
import { config } from "../config/env.ts";

const MAX_ATTEMPTS = 10;
const WINDOW_MILLISECONDS = 15 * 60 * 1000;

// Begränsar inloggning och registrering, där någon kan gissa lösenord eller skapa konton i bulk.
export const authRateLimiter = rateLimit({
	limit: MAX_ATTEMPTS,
	message: { error: AUTHENTICATION_MESSAGES.form.tooManyAttempts },
	skip: () => !config.isRateLimitEnabled,
	statusCode: 429,
	windowMs: WINDOW_MILLISECONDS,
});
