// https://github.com/jonatanhallenberg/utpost-integration-provkorning/blob/main/api/src/graphql/server.test.js

import { count, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { mongo } from "../../src/db/mongo.ts";
import { db, pool } from "../../src/db/postgres.ts";
import { tourLogs } from "../../src/db/schema/index.ts";
import { yoga } from "../../src/graphql/server.ts";
import { sign } from "../../src/lib/token.ts";

const responseSchema = z.object({
	data: z.unknown().optional(),
	errors: z
		.array(
			z.object({
				extensions: z.object({ code: z.string() }).optional(),
				message: z.string(),
			}),
		)
		.optional(),
	extensions: z.object({ databasfragor: z.number().optional() }).optional(),
});

const toursSchema = z.object({
	tours: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			user: z.object({ displayName: z.string() }),
		}),
	),
});
const guideSchema = z.object({ guide: z.null() });
const tourLogsSchema = z.object({
	tour: z.object({ logs: z.array(z.object({ lat: z.number() })) }),
});
const noticesSchema = z.object({
	guides: z.array(z.object({ notices: z.array(z.unknown()) })),
	notices: z.array(z.unknown()),
});

interface SendOptions {
	token?: string;
	variables?: Record<string, unknown>;
}

const sendGraphql = async (query: string, options: SendOptions = {}) => {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (options.token !== undefined) {
		headers["Authorization"] = `Bearer ${options.token}`;
	}
	const response = await yoga.fetch("http://utpost/graphql", {
		body: JSON.stringify({ query, variables: options.variables }),
		headers,
		method: "POST",
	});
	return {
		status: response.status,
		...responseSchema.parse(await response.json()),
	};
};

afterAll(async () => {
	await pool.end();
	await mongo.close();
});

describe("GraphQL-API:et mot riktig databas", () => {
	it("turlistan: 50 turer med vem som gick - för två databasfrågor, inte 51", async () => {
		const { data, errors, extensions } = await sendGraphql(`
      query Turer {
        tours {
          id
          title
          user {
            displayName
          }
        }
      }
    `);
		expect(errors).toBeUndefined();
		const { tours } = toursSchema.parse(data);
		expect(tours).toHaveLength(50);
		for (const tour of tours) {
			expect(tour.user.displayName).toEqual(expect.any(String));
		}
		expect(extensions?.databasfragor).toBeLessThanOrEqual(2);
	});

	it("guide(slug) som inte finns är null - inte ett fel", async () => {
		const { data, errors } = await sendGraphql(`
      query Saknas {
        guide(slug: "finns-inte") {
          title
        }
      }
    `);
		expect(errors).toBeUndefined();
		expect(guideSchema.parse(data).guide).toBeNull();
	});

	it("ett fält som inte finns ger errors - med statuskod 200", async () => {
		const { status, data, errors } = await sendGraphql("{ guides { titel } }");
		expect(status).toBe(200);
		expect(data).toBeUndefined();
		expect(errors?.[0]?.message).toContain('Cannot query field "titel"');
	});

	it("ett id som inte är ett tal ger felkoden BAD_USER_INPUT", async () => {
		const { errors } = await sendGraphql('{ tour(id: "abc") { title } }');
		expect(errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
	});

	it("mätpunkterna kommer från MongoDB och är lika många som i Postgres", async () => {
		const [row] = await db
			.select({ total: count() })
			.from(tourLogs)
			.where(eq(tourLogs.tourId, 1));
		const { data, errors, extensions } = await sendGraphql(`
      query Tur {
        tour(id: 1) {
          logs {
            recordedAt
            lat
          }
        }
      }
    `);
		expect(errors).toBeUndefined();
		expect(tourLogsSchema.parse(data).tour.logs).toHaveLength(row?.total ?? -1);
		expect(extensions?.databasfragor).toBe(2);
	});

	// I testerna är CMS:et avstängt, eftersom pipelinen saknar nycklar. Listan är tom, men frågan ska fungera
	// och rollkontrollen ska gälla ändå.
	it("notices fungerar utan CMS, och utkast kräver rollen editor", async () => {
		const withoutCms = await sendGraphql(
			"{ notices { title } guides { slug notices { title } } }",
		);
		expect(withoutCms.errors).toBeUndefined();
		const noticesData = noticesSchema.parse(withoutCms.data);
		expect(noticesData.notices).toEqual([]);
		expect(noticesData.guides[0]?.notices).toEqual([]);

		const anonymous = await sendGraphql("{ notices(preview: true) { title } }");
		expect(anonymous.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");

		const memberToken = sign({
			email: "medlem@utpost.se",
			id: 2,
			role: "member",
		});
		const asMember = await sendGraphql("{ notices(preview: true) { title } }", {
			token: memberToken,
		});
		expect(asMember.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
	});
});
