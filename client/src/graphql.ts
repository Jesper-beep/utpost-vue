// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/client/src/graphql.ts

export const GRAPHQL_URL = "/graphql";

export const gql = async <T>(
	query: string,
	variables?: Record<string, unknown>,
): Promise<T> => {
	const res = await fetch(GRAPHQL_URL, {
		body: JSON.stringify({ query, variables }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
	const body = (await res.json()) as {
		data?: T;
		errors?: { message: string }[];
	};
	if (body.errors?.length) throw new Error(body.errors[0]?.message);
	if (!body.data) throw new Error(`GraphQL svarade ${res.status} utan data`);
	return body.data;
};
