// https://github.com/jonatanhallenberg/utpost-integration-provkorning/blob/main/api/src/graphql/server.test.js

import { afterAll, describe, expect, it } from "vitest";
import { pool } from "../db/client.js";
import { mongo } from "../db/mongo.js";
import { sign } from "../lib/auth.js";
import { yoga } from "./server.js";

const sendGraphql = async (query, { variables, token } = {}) => {
	const response = await yoga.fetch("http://utpost/graphql", {
		body: JSON.stringify({ query, variables }),
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		method: "POST",
	});
	return { status: response.status, ...(await response.json()) };
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
		expect(data.tours).toHaveLength(50);
		for (const tour of data.tours) {
			expect(tour.user.displayName).toEqual(expect.any(String));
		}
		expect(extensions.databasfragor).toBeLessThanOrEqual(2);
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
		expect(data.guide).toBeNull();
	});

	it("ett fält som inte finns ger errors - med statuskod 200", async () => {
		const { status, data, errors } = await sendGraphql("{ guides { titel } }");
		expect(status).toBe(200);
		expect(data).toBeUndefined();
		expect(errors[0].message).toContain('Cannot query field "titel"');
	});

	it("createTour utan token nekas med koden UNAUTHENTICATED", async () => {
		const { data, errors } = await sendGraphql(`
      mutation NyTur {
        createTour(input: { title: "Testtur", startedAt: "2026-10-23T09:00:00Z", distanceM: 1000 }) {
          id
        }
      }
    `);
		expect(data).toBeNull();
		expect(errors[0].extensions.code).toBe("UNAUTHENTICATED");
	});

	it("createTour med token skapar turen i den inloggades namn", async () => {
		const user = (
			await pool.query(
				"select id, email, role, display_name from users where id = 1",
			)
		).rows[0];
		const token = sign(user);
		const { data, errors } = await sendGraphql(
			`
        mutation NyTur($input: CreateTourInput!) {
          createTour(input: $input) {
            id
            title
            user {
              displayName
            }
          }
        }
      `,
			{
				token,
				variables: {
					input: {
						distanceM: 1000,
						startedAt: "2026-10-23T09:00:00Z",
						title: "Testtur",
					},
				},
			},
		);
		expect(errors).toBeUndefined();
		expect(data.createTour.title).toBe("Testtur");
		expect(data.createTour.user.displayName).toBe(user.display_name);
		await pool.query("delete from tours where id = $1", [data.createTour.id]);
	});

	it("mätpunkterna kommer från MongoDB och är lika många som i Postgres", async () => {
		const { rows } = await pool.query(
			"select count(*)::int as n from tour_logs where tour_id = 1",
		);
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
		expect(data.tour.logs).toHaveLength(rows[0].n);
		expect(extensions.databasfragor).toBe(2);
	});
});
