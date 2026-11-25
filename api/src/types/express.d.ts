import type { TokenUser } from "./auth.ts";

declare module "express-serve-static-core" {
	interface Request {
		user?: TokenUser;
	}
}
