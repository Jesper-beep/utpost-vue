import { AUTHENTICATION_MESSAGES, registerSchema } from "@utpost/shared";
import { Router } from "express";
import { hashPassword } from "../../lib/password.ts";
import { publicUser } from "../../lib/public-user.ts";
import { sign } from "../../lib/token.ts";
import { authRateLimiter } from "../../middleware/rate-limit.ts";
import { createUser } from "../../services/users.ts";

export const signupRouter = Router();

signupRouter.post("/", authRateLimiter, async (request, response) => {
	const { displayName, email, firstName, lastName, password } =
		registerSchema.parse(request.body);
	const passwordHash = await hashPassword(password);
	const result = await createUser({
		displayName,
		email,
		firstName,
		lastName,
		passwordHash,
	});
	if (result.status === "conflict") {
		if (result.field === "email") {
			const { after, before, linkText } =
				AUTHENTICATION_MESSAGES.conflict.email;
			response.status(409).json({
				error: "e-posten används redan",
				issues: [{ message: `${before}${linkText}${after}`, path: "email" }],
			});
		} else {
			response.status(409).json({
				error: "användarnamnet används redan",
				issues: [
					{
						message: AUTHENTICATION_MESSAGES.conflict.displayName,
						path: "displayName",
					},
				],
			});
		}
		return;
	}
	const { user } = result;
	response.status(201).json({ token: sign(user), user: publicUser(user) });
});
