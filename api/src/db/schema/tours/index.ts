import {
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { guides } from "../guides/index.ts";
import { users } from "../users/index.ts";

export const TOUR_GUIDE_FOREIGN_KEY = "tours_guide_id_guides_id_fk";

export const tours = pgTable(
	"tours",
	{
		distanceM: integer().notNull(),
		guideId: integer(),
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		notes: text(),
		startedAt: timestamp({ withTimezone: true }).notNull(),
		title: text().notNull(),
		userId: integer()
			.notNull()
			.references(() => users.id),
	},
	(table) => [
		index("tours_started_at_idx").on(table.startedAt),
		foreignKey({
			columns: [table.guideId],
			foreignColumns: [guides.id],
			name: TOUR_GUIDE_FOREIGN_KEY,
		}).onDelete("set null"),
	],
);

export type TourRow = typeof tours.$inferSelect;
