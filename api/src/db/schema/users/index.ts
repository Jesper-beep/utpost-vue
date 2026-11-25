import { USER_ROLES } from "@utpost/shared";
import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const USER_EMAIL_UNIQUE_CONSTRAINT = "users_email_unique";
export const USER_DISPLAY_NAME_UNIQUE_CONSTRAINT = "users_display_name_unique";

export const userRoleEnum = pgEnum("user_role", USER_ROLES);

export const users = pgTable("users", {
	createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	displayName: text().notNull().unique(USER_DISPLAY_NAME_UNIQUE_CONSTRAINT),
	email: text().notNull().unique(USER_EMAIL_UNIQUE_CONSTRAINT),
	firstName: text().notNull(),
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	lastName: text().notNull(),
	passwordHash: text().notNull(),
	role: userRoleEnum().notNull().default("member"),
});

export type UserRow = typeof users.$inferSelect;
