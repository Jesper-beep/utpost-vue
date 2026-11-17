import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/vue";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { post } from "../api.js";
import { getToken } from "../lib/token.js";
import { useAuthStore } from "../stores/auth.js";
import LoginView from "./LoginView.vue";

vi.mock("../api.js", () => ({ post: vi.fn() }));
const push = vi.fn();
vi.mock("vue-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("vue-router")>()),
	useRoute: () => ({ query: { till: "/turer/1/bild" } }),
	useRouter: () => ({ push }),
}));
const mockedPost = vi.mocked(post);

const fillAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.type(screen.getByLabelText("E-post"), "anna@example.com");
	await user.type(screen.getByLabelText("Lösenord"), "hemligt123");
	await user.click(screen.getByRole("button", { name: "Logga in" }));
};

describe("LoginView", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useAuthStore().logout();
		push.mockClear();
	});

	afterEach(() => {
		cleanup();
	});

	it("visar API:ets felmeddelande vid fel uppgifter och sparar ingen token", async () => {
		mockedPost.mockResolvedValue({ error: "fel e-post eller lösenord" });
		const user = userEvent.setup();
		render(LoginView);
		await fillAndSubmit(user);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"fel e-post eller lösenord",
		);
		expect(getToken()).toBeNull();
		expect(push).not.toHaveBeenCalled();
	});

	it("sparar token i minnet och inte i localStorage, och skickar användaren tillbaka till sidan som efterfrågades", async () => {
		mockedPost.mockResolvedValue({
			token: "jwt-from-api",
			user: {
				created_at: "",
				display_name: "Anna",
				email: "anna@example.com",
				id: 1,
				role: "member",
			},
		});
		const user = userEvent.setup();
		render(LoginView);
		await fillAndSubmit(user);

		expect(mockedPost).toHaveBeenCalledWith("/auth/login", {
			email: "anna@example.com",
			password: "hemligt123",
		});
		expect(getToken()).toBe("jwt-from-api");
		expect(useAuthStore().user?.display_name).toBe("Anna");
		expect(localStorage.length).toBe(0);
		expect(push).toHaveBeenCalledWith("/turer/1/bild");
	});
});
