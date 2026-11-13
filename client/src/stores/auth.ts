import type {
	ApiError,
	LoginRequest,
	LoginResponse,
	User,
} from "@utpost/shared";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { post } from "../api";
import { getToken, setToken } from "../lib/token";

// Här finns vem som är inloggad.
// Själva token ligger i lib/token.ts och används bara av api.ts.
export const useAuthStore = defineStore("auth", () => {
	const user = ref<User | null>(null);
	const isLoggedIn = computed(() => user.value !== null && getToken() !== null);

	// Fel uppgifter ger 401 med { error } från API:et.
	// Vi kastar det som ett Error så att vyn kan visa texten, och ingen token sparas.
	const login = async (credentials: LoginRequest) => {
		const response = await post<LoginResponse | ApiError>(
			"/auth/login",
			credentials,
		);
		if ("error" in response) throw new Error(response.error);
		setToken(response.token);
		user.value = response.user;
	};

	const logout = () => {
		setToken(null);
		user.value = null;
	};

	return { isLoggedIn, login, logout, user };
});
