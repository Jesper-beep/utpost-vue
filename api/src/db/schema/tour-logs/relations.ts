import { relations } from "drizzle-orm";
import { tours } from "../tours/index.ts";
import { tourLogs } from "./index.ts";

export const tourLogsRelations = relations(tourLogs, ({ one }) => ({
	tour: one(tours, { fields: [tourLogs.tourId], references: [tours.id] }),
}));
