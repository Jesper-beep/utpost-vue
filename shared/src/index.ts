// https://github.com/jonatanhallenberg/utpost-ts-labb/blob/main/shared/src/index.ts

export type Difficulty = "lätt" | "medel" | "svår";

export interface Guide {
	id: number;
	slug: string;
	title: string;
	region: string;
	difficulty: Difficulty;
	length_km: number;
	body_html: string;
	hero_image: string | null;
	published: boolean;
	author_id: number | null;
	updated_at: string;
}

export interface User {
	id: number;
	email: string;
	display_name: string;
	role: "member" | "editor";
	created_at: string;
	password_hash: string; // password_hash är inte ett hash, detta ska vi ändra senare (skuld)
}

export interface TourLog {
	id: number;
	tour_id: number;
	recorded_at: string;
	lat: number;
	lon: number;
	elevation_m: number | null;
	heart_rate: number | null;
	note: string | null;
}

export const PHOTO_WIDTHS = [256, 384, 640, 750, 828, 1080, 1200, 1920];
export const PHOTO_MIN_WIDTH = 1920;
export const PHOTO_MIN_HEIGHT = 1080;
export const PHOTO_MAX_UPLOAD_MB = 10;

export const getPhotoFilename = (photoKey: string, width: number): string => {
	return `${photoKey}-${width}.avif`;
};

export interface Photo {
	id: number;
	tour_id: number;
	filename: string;
	width: number;
	height: number;
	created_at: string;
}

export interface Tour {
	id: number;
	user_id: number;
	guide_id: number | null;
	title: string;
	started_at: string;
	distance_m: number;
	notes: string | null;
}

export interface GuideSummary
	extends Pick<Guide, "body_html" | "length_km" | "region" | "slug" | "title"> {
	difficulty: string;
	id: number | string;
}

export interface TourSummary extends Pick<Tour, "distance_m" | "title"> {
	id: number | string;
}

export interface TourWithRelations extends Tour {
	user: User;
	guide: Guide | null;
	photos: Photo[];
	logs: TourLog[];
}

export interface TourDetail extends Tour {
	logs: TourLog[];
	photos: Photo[];
}

export interface GuideDetail {
	guide: Guide;
	photos: Photo[];
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	token: string;
	user: User;
}

export interface ApiError {
	error: string;
}

export interface RegisterRequest extends LoginRequest {
	displayName: string;
}
