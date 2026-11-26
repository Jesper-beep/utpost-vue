CREATE TYPE "public"."difficulty" AS ENUM('lätt', 'medel', 'svår');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'editor');--> statement-breakpoint
CREATE TABLE "guides" (
	"author_id" integer,
	"body_html" text NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"hero_image" text,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guides_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"length_km" double precision NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"region" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guides_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"filename" text NOT NULL,
	"height" integer NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tour_id" integer NOT NULL,
	"width" integer NOT NULL,
	CONSTRAINT "photos_tour_id_unique" UNIQUE("tour_id")
);
--> statement-breakpoint
CREATE TABLE "tour_logs" (
	"elevation_m" integer,
	"heart_rate" integer,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tour_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"note" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"tour_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"distance_m" integer NOT NULL,
	"guide_id" integer,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tours_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notes" text,
	"started_at" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"last_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	CONSTRAINT "users_display_name_unique" UNIQUE("display_name"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_logs" ADD CONSTRAINT "tour_logs_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tour_logs_tour_id_recorded_at_idx" ON "tour_logs" USING btree ("tour_id","recorded_at");--> statement-breakpoint
CREATE INDEX "tours_started_at_idx" ON "tours" USING btree ("started_at");