import type DataLoader from "dataloader";
import type {
	guideExcerpt,
	previewNotices,
	publishedNotices,
} from "../cms/contentful.js";
import type { PhotoRow } from "../db/schema/photos/index.ts";
import type { UserRow } from "../db/schema/users/index.ts";
import type { TokenUser } from "./auth.ts";
import type { GuideListRow } from "./guides.ts";
import type { LogPointDocument } from "./tour-logs.ts";

export interface Loaders {
	guide: DataLoader<number, GuideListRow | null>;
	logs: DataLoader<number, LogPointDocument[]>;
	photos: DataLoader<number, PhotoRow[]>;
	user: DataLoader<number, UserRow | null>;
}

export interface GraphQLContext {
	cms: {
		guideExcerpt: typeof guideExcerpt;
		notices: typeof publishedNotices;
		previewNotices: typeof previewNotices;
	};
	ip: string | undefined;
	loaders: Loaders;
	user: TokenUser | null;
}
