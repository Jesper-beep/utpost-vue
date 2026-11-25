import { registerSchema } from "@utpost/shared";
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
			response.status(409).json({ error: "e-posten används redan" });
		} else {
			response.status(409).json({ error: "användarnamnet används redan" });
		}
		return;
	}
	const { user } = result;
	response.status(201).json({ token: sign(user), user: publicUser(user) });
});
