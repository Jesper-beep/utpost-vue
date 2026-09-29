import {
	boolean,
	doublePrecision,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	createdAt: timestamp("created_at").notNull().defaultNow(),
	displayName: text("display_name").notNull(),
	email: text("email").notNull(),
	id: serial("id").primaryKey(),
	passwordHash: text("password_hash").notNull(),
	role: text("role").notNull().default("member"),
});

export const guides = pgTable("guides", {
	authorId: integer("author_id"),
	// Redaktionen skickar in HTML som vi klistrar in här. Fungerar.
	bodyHtml: text("body_html").notNull(),
	difficulty: text("difficulty").notNull(),
	heroImage: text("hero_image"),
	id: serial("id").primaryKey(),
	lengthKm: doublePrecision("length_km").notNull(),
	published: boolean("published").notNull().default(true),
	region: text("region").notNull(),
	slug: text("slug").notNull(),
	title: text("title").notNull(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tours = pgTable("tours", {
	distanceM: integer("distance_m").notNull(),
	guideId: integer("guide_id"),
	id: serial("id").primaryKey(),
	notes: text("notes"),
	startedAt: timestamp("started_at").notNull(),
	title: text("title").notNull(),
	userId: integer("user_id").notNull(),
});

// En rad per mätpunkt. Växer med ca 300 rader per tur.
export const tourLogs = pgTable("tour_logs", {
	elevationM: integer("elevation_m"),
	heartRate: integer("heart_rate"),
	id: serial("id").primaryKey(),
	lat: doublePrecision("lat").notNull(),
	lon: doublePrecision("lon").notNull(),
	note: text("note"),
	recordedAt: timestamp("recorded_at").notNull(),
	tourId: integer("tour_id").notNull(),
});

export const photos = pgTable("photos", {
	createdAt: timestamp("created_at").notNull().defaultNow(),
	filename: text("filename").notNull(),
	height: integer("height").notNull(),
	id: serial("id").primaryKey(),
	tourId: integer("tour_id").notNull(),
	width: integer("width").notNull(),
});
