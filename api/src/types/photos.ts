import type { PhotoUploadResponse } from "@utpost/shared";
import type { PhotoRow } from "../db/schema/photos/index.ts";

export interface TourForUpload {
	hasPhoto: boolean;
	userId: number;
}

export type InsertPhotoResult =
	| { status: "saved"; photo: PhotoRow }
	| { status: "conflict" };

export type UploadPhotoResult =
	| { status: "saved"; response: PhotoUploadResponse }
	| { status: "conflict" };
