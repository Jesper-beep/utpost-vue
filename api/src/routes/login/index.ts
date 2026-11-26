import { loginSchema } from "@utpost/shared";
import { Router } from "express";
import { verifyPassword } from "../../lib/password.ts";
import { publicUser } from "../../lib/public-user.ts";
import { sign } from "../../lib/token.ts";
import { authRateLimiter } from "../../middleware/rate-limit.ts";
import { findUserByEmail } from "../../services/users.ts";

export const loginRouter = Router();

loginRouter.post("/", authRateLimiter, async (request, response) => {
	const { email, password } = loginSchema.parse(request.body);
	const user = await findUserByEmail(email);
	const isPasswordCorrect = await verifyPassword(password, user?.passwordHash);
	if (user === null || !isPasswordCorrect) {
		response.status(401).json({ error: "fel e-post eller lösenord" });
		return;
	}
	response.json({ token: sign(user), user: publicUser(user) });
});
