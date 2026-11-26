import { DIFFICULTIES } from "@utpost/shared";
import {
	boolean,
	doublePrecision,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { users } from "../users/index.ts";

export const difficultyEnum = pgEnum("difficulty", DIFFICULTIES);

export const guides = pgTable("guides", {
	authorId: integer().references(() => users.id, { onDelete: "set null" }),
	// Redaktionen skickar in HTML som vi klistrar in här. Fungerar.
	bodyHtml: text().notNull(),
	difficulty: difficultyEnum().notNull(),
	heroImage: text(),
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	lengthKm: doublePrecision().notNull(),
	published: boolean().notNull().default(true),
	region: text().notNull(),
	slug: text().notNull().unique(),
	title: text().notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type GuideRow = typeof guides.$inferSelect;
