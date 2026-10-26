import { cacheExchange, createClient, fetchExchange } from "@urql/vue";

export const client = createClient({
	exchanges: [cacheExchange, fetchExchange],
	preferGetMethod: false,
	url: "/graphql",
});
