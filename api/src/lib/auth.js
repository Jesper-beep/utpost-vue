import jwt from "jsonwebtoken";
import { config } from "../config.js";

// Token gäller i en timme. Om den läcker ska den snart vara värdelös.
export const sign = (user) =>
	jwt.sign(
		{ email: user.email, id: user.id, role: user.role },
		config.jwtSecret,
		{
			algorithm: "HS256",
			expiresIn: "1h",
		},
	);

// Det här får skickas till klienten. password_hash ska aldrig lämna API:et.
export const publicUser = (row) => ({
	created_at: row.created_at,
	display_name: row.display_name,
	email: row.email,
	id: row.id,
	role: row.role,
});

// Skyddet sitter i API:et, inte i klientens router.
// Utan giltig token svarar vi 401 och anropet körs aldrig.
// Bara HS256 godtas, så att en token med "alg: none" inte går igenom.
export const requireUser = (req, res, next) => {
	const header = req.headers.authorization ?? "";
	const token = header.startsWith("Bearer ") ? header.slice(7) : null;
	if (!token) return res.status(401).json({ error: "inloggning krävs" });
	try {
		req.user = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
		next();
	} catch {
		res.status(401).json({ error: "ogiltig eller utgången token" });
	}
};

// 401 betyder att vi inte vet vem du är. 403 betyder att du inte får.
export const requireRole = (role) => (req, res, next) => {
	if (req.user?.role !== role)
		return res.status(403).json({ error: `kräver rollen ${role}` });
	next();
};
