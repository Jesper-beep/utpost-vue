import { API_URL } from "./config.js";
import { getToken } from "./lib/token.js";

const buildHeaders = (extraHeaders: Record<string, string> = {}) => {
	const token = getToken();
	return {
		...extraHeaders,
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
};

export const get = async <T>(path: string): Promise<T> => {
	const response = await fetch(`${API_URL}${path}`, {
		headers: buildHeaders(),
	});
	return response.json();
};

export const post = async <T>(path: string, body: unknown): Promise<T> => {
	const response = await fetch(`${API_URL}${path}`, {
		body: JSON.stringify(body),
		headers: buildHeaders({ "Content-Type": "application/json" }),
		method: "POST",
	});
	return response.json();
};
