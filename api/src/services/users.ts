import { eq, inArray } from "drizzle-orm";
import { db } from "../db/postgres.ts";
import {
	USER_DISPLAY_NAME_UNIQUE_CONSTRAINT,
	USER_EMAIL_UNIQUE_CONSTRAINT,
	type UserRow,
	users,
} from "../db/schema/users/index.ts";
import { getUniqueViolationConstraint } from "../lib/database-errors.ts";
import type { CreateUserResult } from "../types/users.ts";

interface NewUser {
	displayName: string;
	email: string;
	firstName: string;
	lastName: string;
	passwordHash: string;
}

export const findUserByEmail = async (
	email: string,
): Promise<UserRow | null> => {
	const [user] = await db.select().from(users).where(eq(users.email, email));
	if (user === undefined) {
		return null;
	} else {
		return user;
	}
};

export const findUsersByIds = (ids: readonly number[]): Promise<UserRow[]> => {
	return db
		.select()
		.from(users)
		.where(inArray(users.id, [...ids]));
};

// De unika kontrollerna i databasen avgör, så två samtidiga registreringar kan inte båda lyckas.
export const createUser = async (
	newUser: NewUser,
): Promise<CreateUserResult> => {
	try {
		const [user] = await db.insert(users).values(newUser).returning();
		if (user === undefined) {
			throw new Error("Användaren sparades inte");
		} else {
			return { status: "created", user };
		}
	} catch (error) {
		const constraint = getUniqueViolationConstraint(error);
		if (constraint === USER_EMAIL_UNIQUE_CONSTRAINT) {
			return { field: "email", status: "conflict" };
		}
		if (constraint === USER_DISPLAY_NAME_UNIQUE_CONSTRAINT) {
			return { field: "displayName", status: "conflict" };
		}
		throw error;
	}
};
