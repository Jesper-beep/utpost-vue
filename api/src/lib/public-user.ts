import type { UserRow } from "../db/schema/users/index.ts";

export type PublicUser = Pick<
	UserRow,
	| "createdAt"
	| "displayName"
	| "email"
	| "firstName"
	| "id"
	| "lastName"
	| "role"
>;

// Det här får skickas till klienten. passwordHash ska aldrig lämna API:et.
export const publicUser = (user: UserRow): PublicUser => {
	return {
		createdAt: user.createdAt,
		displayName: user.displayName,
		email: user.email,
		firstName: user.firstName,
		id: user.id,
		lastName: user.lastName,
		role: user.role,
	};
};
