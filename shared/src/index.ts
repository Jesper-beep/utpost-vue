// https://github.com/jonatanhallenberg/utpost-ts-labb/blob/main/shared/src/index.ts

export * from "./messages/authentication.ts";
export * from "./schemas/authentication.ts";

export const DIFFICULTIES = ["lätt", "medel", "svår"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const USER_ROLES = ["member", "editor"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface Guide {
	id: number;
	slug: string;
	title: string;
	region: string;
	difficulty: Difficulty;
	lengthKm: number;
	bodyHtml: string;
	heroImage: string | null;
	published: boolean;
	authorId: number | null;
	updatedAt: string;
}

export interface User {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	displayName: string;
	role: UserRole;
	createdAt: string;
}

export interface TourLog {
	id: number;
	tourId: number;
	recordedAt: string;
	lat: number;
	lon: number;
	elevationM: number | null;
	heartRate: number | null;
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
	tourId: number;
	filename: string;
	width: number;
	height: number;
	createdAt: string;
}

export interface PhotoVariant {
	width: number;
	height: number;
	sizeBytes: number;
}

export interface PhotoUploadResponse extends Photo {
	variants: PhotoVariant[];
	processingMs: number;
	apiMs: number;
	coldStart: boolean;
	instance: string;
}

export interface Tour {
	id: number;
	userId: number;
	guideId: number | null;
	title: string;
	startedAt: string;
	distanceM: number;
	notes: string | null;
}

export interface GuideSummary
	extends Pick<Guide, "lengthKm" | "region" | "slug" | "title"> {
	difficulty: string;
	excerpt: string;
	id: number | string;
}

export interface TourSummary extends Pick<Tour, "distanceM" | "title"> {
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

export interface LoginResponse {
	token: string;
	user: User;
}

export interface ApiIssue {
	message: string;
	path: string;
}

export interface ApiError {
	error: string;
	issues?: ApiIssue[];
}
