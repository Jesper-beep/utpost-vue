import type {
	ApiError,
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	User,
} from "@utpost/shared";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { post } from "../api.js";
import { getToken, setToken } from "../lib/token.js";

// Här sparas vem som är inloggad.
// Själva token ligger i lib/token.ts, och bara api.ts och PhotoUploader läser den.
export const useAuthStore = defineStore("auth", () => {
	const user = ref<User | null>(null);
	const isLoggedIn = computed(() => user.value !== null && getToken() !== null);

	// Vid fel uppgifter svarar API:et 401 med { error }.
	// Vi kastar felet så att vyn kan visa texten, och ingen token sparas.
	const authenticate = async (
		path: string,
		body: LoginRequest | RegisterRequest,
	) => {
		let response: LoginResponse | ApiError;
		try {
			response = await post<LoginResponse | ApiError>(path, body);
		} catch {
			throw new Error("Något gick fel. Försök igen senare.");
		}
		if ("error" in response) throw new Error(response.error);
		setToken(response.token);
		user.value = response.user;
	};

	const login = (credentials: LoginRequest) =>
		authenticate("/auth/login", credentials);

	const register = (details: RegisterRequest) =>
		authenticate("/auth/register", details);

	const logout = () => {
		setToken(null);
		user.value = null;
	};

	return { isLoggedIn, login, logout, register, user };
});
