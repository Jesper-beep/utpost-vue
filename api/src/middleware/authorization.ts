import type { UserRole } from "@utpost/shared";
import type { NextFunction, Request, Response } from "express";

// Körs efter requireUser, som har satt användaren.
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
