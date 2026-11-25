import type { Server } from "node:http";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { app } from "../../src/app.ts";
import { mongo } from "../../src/db/mongo.ts";
import { db, pool } from "../../src/db/postgres.ts";
import {
	type GuideRow,
	guides,
	photos,
	type UserRow,
	users,
} from "../../src/db/schema/index.ts";

// Gemensam kod för säkerhetstesterna mot REST-API:et och de riktiga databaserna. Appen startas på en ledig port och stängs när testfilen är klar.
// Varje hål som lagas har ett test som var rött före rättningen. Testet bevisar att hålet fanns och hindrar det från att komma tillbaka.
let server: Server | undefined;
let baseUrl: string | undefined;

interface CallOptions {
	body?: unknown;
	method?: string;
	token?: string;
}

export const errorSchema = z.object({ error: z.string() });
export const issuesSchema = z.object({
	error: z.string(),
	issues: z.array(z.object({ message: z.string(), path: z.string() })),
});
export const recordSchema = z.record(z.string(), z.unknown());

export const startTestServer = async (): Promise<void> => {
	const listeningServer = app.listen(0);
	await new Promise((resolve) => listeningServer.once("listening", resolve));
	const address = listeningServer.address();
	if (address === null || typeof address === "string") {
		throw new Error("Testservern lyssnar inte på en port");
	}
	server = listeningServer;
	baseUrl = `http://127.0.0.1:${address.port}`;
};

export const stopTestServer = async (): Promise<void> => {
	if (server !== undefined) {
		const runningServer = server;
		await new Promise((resolve) => runningServer.close(resolve));
	}
	await pool.end();
	await mongo.close();
};

export const getBaseUrl = (): string => {
	if (baseUrl === undefined) {
		throw new Error("Testservern är inte startad");
	} else {
		return baseUrl;
	}
};

export const callApi = (
	path: string,
	{ body, method = "GET", token }: CallOptions = {},
): Promise<Response> => {
	const headers: Record<string, string> = {
		"content-type": "application/json",
	};
	if (token !== undefined) {
		headers["authorization"] = `Bearer ${token}`;
	}
	const init: RequestInit = { headers, method };
	if (body !== undefined) {
		init.body = JSON.stringify(body);
	}
	return fetch(`${getBaseUrl()}${path}`, init);
};

export const readJson = async <TSchema extends z.ZodType>(
	response: Response,
	schema: TSchema,
): Promise<z.output<TSchema>> => {
	return schema.parse(await response.json());
};

export const expectRow = <T>(row: T | undefined): T => {
	if (row === undefined) {
		throw new Error("Raden saknas i testdatan - kör seed först");
	} else {
		return row;
	}
};

export const findUser = async (identifier: number): Promise<UserRow> => {
	const [user] = await db.select().from(users).where(eq(users.id, identifier));
	return expectRow(user);
};

export const findMember = async (): Promise<UserRow> => {
	const [member] = await db
		.select()
		.from(users)
		.where(eq(users.role, "member"))
		.limit(1);
	return expectRow(member);
};

export const findGuide = async (): Promise<GuideRow> => {
	const [guide] = await db.select().from(guides).orderBy(guides.id).limit(1);
	return expectRow(guide);
};

export const countPhotos = async (): Promise<number> => {
	const [row] = await db.select({ total: count() }).from(photos);
	return expectRow(row).total;
};

export const toGuideBody = (guide: GuideRow) => ({
	bodyHtml: guide.bodyHtml,
	difficulty: guide.difficulty,
	lengthKm: guide.lengthKm,
	published: guide.published,
	region: guide.region,
	title: guide.title,
});
