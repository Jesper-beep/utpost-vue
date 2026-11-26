import type {
	ApiError,
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	User,
} from "@utpost/shared";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { type PostResponse, post } from "../api.js";
import { AuthenticationError } from "../lib/authentication-error.js";
import { getToken, setToken } from "../lib/token.js";

// Här sparas vem som är inloggad.
// Själva token ligger i lib/token.ts, och bara api.ts och PhotoUploader läser den.
export const useAuthStore = defineStore("auth", () => {
	const user = ref<User | null>(null);
	const isLoggedIn = computed(() => user.value !== null && getToken() !== null);

	// Vid fel svarar API:et med { error } och en statuskod, till exempel 401 vid fel uppgifter.
	// Vi kastar ett AuthenticationError så att vyn kan välja text, och ingen token sparas.
	const authenticate = async (
		path: string,
		body: LoginRequest | RegisterRequest,
	) => {
		let response: PostResponse<LoginResponse | ApiError>;
		try {
			response = await post<LoginResponse | ApiError>(path, body);
		} catch {
			throw new AuthenticationError(0);
		}
		if ("error" in response.body) {
			throw new AuthenticationError(response.status, response.body.issues);
		}
		if (response.status >= 400) {
			throw new AuthenticationError(response.status);
		}
		setToken(response.body.token);
		user.value = response.body.user;
	};

	const login = (credentials: LoginRequest) =>
		authenticate("/auth/login", credentials);

	const register = (details: RegisterRequest) =>
		authenticate("/auth/signup", details);

	const logout = () => {
		setToken(null);
		user.value = null;
	};

	return { isLoggedIn, login, logout, register, user };
});
