import { relations } from "drizzle-orm";
import { tours } from "../tours/index.ts";
import { photos } from "./index.ts";

export const photosRelations = relations(photos, ({ one }) => ({
	tour: one(tours, { fields: [photos.tourId], references: [tours.id] }),
}));
