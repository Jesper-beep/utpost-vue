export const API_URL = "/api";

export const get = async (path) => {
	const res = await fetch(`${API_URL}${path}`);
	return res.json();
};

export const post = async (path, body) => {
	const res = await fetch(`${API_URL}${path}`, {
		body: JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
	return res.json();
};
