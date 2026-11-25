import type { UserRow } from "../db/schema/users/index.ts";

export type CreateUserResult =
	| { status: "created"; user: UserRow }
	| { status: "conflict"; field: "displayName" | "email" };
