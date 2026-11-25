import { relations } from "drizzle-orm";
import { guides } from "../guides/index.ts";
import { photos } from "../photos/index.ts";
import { tourLogs } from "../tour-logs/index.ts";
import { users } from "../users/index.ts";
import { tours } from "./index.ts";

export const toursRelations = relations(tours, ({ many, one }) => ({
	guide: one(guides, { fields: [tours.guideId], references: [guides.id] }),
	logs: many(tourLogs),
	photos: many(photos),
	user: one(users, { fields: [tours.userId], references: [users.id] }),
}));
