import type { PhotoRow } from "../db/schema/photos/index.ts";
import type { TourLogRow } from "../db/schema/tour-logs/index.ts";
import type { TourRow } from "../db/schema/tours/index.ts";
import type { PublicUser } from "../lib/public-user.ts";
import type { GuideListRow } from "./guides.ts";

export interface TourWithRelations extends TourRow {
	guide: GuideListRow | null;
	logs: TourLogRow[];
	photos: PhotoRow[];
	user: PublicUser;
}

export interface TourDetail extends TourRow {
	logs: TourLogRow[];
	photos: PhotoRow[];
}

export type CreateTourResult =
	| { status: "created"; tour: TourRow }
	| { status: "guide-missing" };

export type DeleteTourResult =
	| { status: "deleted" }
	| { status: "forbidden" }
	| { status: "not-found" };
