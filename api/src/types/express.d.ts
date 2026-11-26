import type { TokenUser } from "./authentication.ts";

declare module "express-serve-static-core" {
	interface Request {
		user?: TokenUser;
	}
}
