import { cacheExchange, createClient, fetchExchange } from "@urql/vue";
import { getToken } from "./lib/token.js";

export const client = createClient({
	exchanges: [cacheExchange, fetchExchange],
	// Förhandsgranskningen kräver inloggning, så token följer med varje anrop. Utan token är anropet anonymt.
	fetchOptions: () => {
		const token = getToken();
		if (!token) {
			return {};
		}
		return { headers: { Authorization: `Bearer ${token}` } };
	},
	preferGetMethod: false,
	url: "/graphql",
});
