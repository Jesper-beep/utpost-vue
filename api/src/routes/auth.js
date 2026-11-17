import { Router } from "express";
import { pool } from "../db/client.js";
import { publicUser, sign } from "../lib/auth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { loginSchema, registerSchema } from "../lib/schemas.js";
import { validate } from "../lib/validate.js";
import { wrap } from "../lib/wrap.js";

export const authRouter = Router();

authRouter.post(
	"/login",
	validate(loginSchema),
	wrap(async (req, res) => {
		const { email, password } = req.body;
		const result = await pool.query("select * from users where email = $1", [
			email,
		]);
		const user = result.rows[0];
		const isPasswordCorrect = await verifyPassword(
			password,
			user?.password_hash,
		);
		if (!user || !isPasswordCorrect) {
			return res.status(401).json({ error: "fel e-post eller lösenord" });
		}
		res.json({ token: sign(user), user: publicUser(user) });
	}),
);

authRouter.post(
	"/register",
	validate(registerSchema),
	wrap(async (req, res) => {
		const { email, password, displayName } = req.body;
		const existingUser = await pool.query(
			"select id from users where email = $1",
			[email],
		);
		if (existingUser.rows[0]) {
			return res.status(409).json({ error: "e-posten används redan" });
		}
		const passwordHash = await hashPassword(password);
		const result = await pool.query(
			"insert into users (email, password_hash, display_name) values ($1,$2,$3) returning *",
			[email, passwordHash, displayName],
		);
		const user = result.rows[0];
		res.status(201).json({ token: sign(user), user: publicUser(user) });
	}),
);
