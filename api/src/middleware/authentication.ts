import type { UserRole } from "@utpost/shared";
import type { NextFunction, Request, Response } from "express";
import { readBearerToken, verifyToken } from "../lib/token.ts";
import type { TokenUser } from "../types/auth.ts";

// Skyddet sitter i API:et, inte i klientens router.
// Utan giltig token svarar vi 401 och anropet körs aldrig.
export const requireUser = (
	request: Request,
	response: Response,
	next: NextFunction,
): void => {
	const token = readBearerToken(request.headers.authorization);
	if (token === null) {
		response.status(401).json({ error: "inloggning krävs" });
		return;
	}

	let user: TokenUser;
	try {
		user = verifyToken(token);
	} catch {
		response.status(401).json({ error: "ogiltig eller utgången token" });
		return;
	}

	request.user = user;
	next();
};

// 401 betyder att vi inte vet vem du är. 403 betyder att du inte får.
export const requireRole = (role: UserRole) => {
	return (request: Request, response: Response, next: NextFunction): void => {
		if (request.user?.role === role) {
			next();
		} else {
			response.status(403).json({ error: `kräver rollen ${role}` });
		}
	};
};

// Körs efter requireUser, som har satt användaren.
export const getAuthenticatedUser = (request: Request): TokenUser => {
	if (request.user === undefined) {
		throw new Error("getAuthenticatedUser kördes utan requireUser");
	} else {
		return request.user;
	}
};
