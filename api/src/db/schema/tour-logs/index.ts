import {
	doublePrecision,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { tours } from "../tours/index.ts";

// En rad per mätpunkt. Växer med ca 300 rader per tur.
export const tourLogs = pgTable(
	"tour_logs",
	{
		elevationM: integer(),
		heartRate: integer(),
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		lat: doublePrecision().notNull(),
		lon: doublePrecision().notNull(),
		note: text(),
		recordedAt: timestamp({ withTimezone: true }).notNull(),
		tourId: integer()
			.notNull()
			.references(() => tours.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("tour_logs_tour_id_recorded_at_idx").on(
			table.tourId,
			table.recordedAt,
		),
	],
);

export type TourLogRow = typeof tourLogs.$inferSelect;
