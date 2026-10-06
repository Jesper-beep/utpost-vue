import type {
	ApiError,
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	User,
} from "@utpost/shared";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { API_URL } from "../config.js";

const readStoredUser = (): User | null => {
	try {
		return JSON.parse(localStorage.getItem("user") ?? "null");
	} catch {
		return null;
	}
};

export const useSessionStore = defineStore("session", () => {
	const token = ref<string | null>(localStorage.getItem("token"));
	const user = ref<User | null>(readStoredUser());
	const isLoggedIn = computed(() => token.value !== null);

	watch(token, (value) => {
		if (value === null) {
			localStorage.removeItem("token");
		} else {
			localStorage.setItem("token", value);
		}
	});

	watch(user, (value) => {
		if (value === null) {
			localStorage.removeItem("user");
		} else {
			localStorage.setItem("user", JSON.stringify(value));
		}
	});

	const authenticate = async (
		path: string,
		body: LoginRequest | RegisterRequest,
	): Promise<string | null> => {
		try {
			const response = await fetch(`${API_URL}${path}`, {
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			const data: LoginResponse | ApiError = await response.json();
			if ("error" in data) {
				return data.error;
			}

			token.value = data.token;
			user.value = data.user;
			return null;
		} catch {
			return "Något gick fel. Försök igen senare.";
		}
	};

	const login = (credentials: LoginRequest) =>
		authenticate("/auth/login", credentials);

	const register = (details: RegisterRequest) =>
		authenticate("/auth/register", details);

	const logout = () => {
		token.value = null;
		user.value = null;
	};

	return { isLoggedIn, login, logout, register, token, user };
});
