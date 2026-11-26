import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { tours } from "../tours/index.ts";

export const PHOTO_TOUR_UNIQUE_CONSTRAINT = "photos_tour_id_unique";

// Unikt tourId: en tur har högst en bild.
export const photos = pgTable("photos", {
	createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	filename: text().notNull(),
	height: integer().notNull(),
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	tourId: integer()
		.notNull()
		.unique(PHOTO_TOUR_UNIQUE_CONSTRAINT)
		.references(() => tours.id, { onDelete: "cascade" }),
	width: integer().notNull(),
});

export type PhotoRow = typeof photos.$inferSelect;
