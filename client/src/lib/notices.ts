export interface TextRun {
	text: string;
	bold: boolean;
	italic: boolean;
	href?: string | null;
}

// kind är paragraph, heading-2, heading-3, bullet-item eller number-item. GraphQL har ingen enum med bindestreck, så typen är string.
export interface Block {
	kind: string;
	runs: TextRun[];
}

export interface Notice {
	id: string;
	title: string;
	level: string;
	status: string;
	guideSlug?: string | null;
	body: Block[];
}
