export interface TextRun {
	bold: boolean;
	href: string | null;
	italic: boolean;
	text: string;
}

export interface Block {
	kind: string;
	runs: TextRun[];
}

export interface Notice {
	body: Block[];
	guideSlug: string | null;
	id: string;
	level: string;
	status: string;
	title: string;
}
