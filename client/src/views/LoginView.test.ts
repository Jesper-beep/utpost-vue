import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/vue";
import { AUTHENTICATION_MESSAGES } from "@utpost/shared";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { post } from "../api.js";
import { getToken } from "../lib/token.js";
import { useAuthStore } from "../stores/authentication.js";
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
	await user.type(
		screen.getByLabelText("E-post"),
		"anna.pyttipanna@example.com",
	);
	await user.type(screen.getByLabelText("Lösenord"), "hemligt123");
	await user.click(screen.getByRole("button", { name: "Logga in" }));
};

describe("LoginView", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useAuthStore().logout();
		push.mockClear();
		mockedPost.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	it("visar felmeddelandet för fel uppgifter och sparar ingen token", async () => {
		mockedPost.mockResolvedValue({
			body: { error: "fel e-post eller lösenord" },
			status: 401,
		});
		const user = userEvent.setup();
		render(LoginView);
		await fillAndSubmit(user);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			AUTHENTICATION_MESSAGES.form.invalidCredentials,
		);
		expect(getToken()).toBeNull();
		expect(push).not.toHaveBeenCalled();
	});

	it("visar felmeddelandet för för många försök", async () => {
		mockedPost.mockResolvedValue({
			body: { error: AUTHENTICATION_MESSAGES.form.tooManyAttempts },
			status: 429,
		});
		const user = userEvent.setup();
		render(LoginView);
		await fillAndSubmit(user);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			AUTHENTICATION_MESSAGES.form.tooManyAttempts,
		);
	});

	it("visar ett allmänt felmeddelande när API:et inte går att nå", async () => {
		mockedPost.mockRejectedValue(new TypeError("Failed to fetch"));
		const user = userEvent.setup();
		render(LoginView);
		await fillAndSubmit(user);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			AUTHENTICATION_MESSAGES.form.failed,
		);
	});

	it("visar ett allmänt felmeddelande och sparar ingen token när svaret saknar error men har felstatus", async () => {
		mockedPost.mockResolvedValue({ body: {}, status: 502 });
		const user = userEvent.setup();
		render(LoginView);
		await fillAndSubmit(user);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			AUTHENTICATION_MESSAGES.form.failed,
		);
		expect(getToken()).toBeNull();
	});

	it("visar felet för ett fält när användaren lämnar det, men inte för fält som ännu inte är besökta", async () => {
		const user = userEvent.setup();
		render(LoginView);
		await user.type(screen.getByLabelText("E-post"), "anna");
		await user.tab();

		expect(
			screen.getByText(AUTHENTICATION_MESSAGES.email.invalid),
		).toBeInTheDocument();
		expect(
			screen.queryByText(AUTHENTICATION_MESSAGES.password.required),
		).not.toBeInTheDocument();
		expect(mockedPost).not.toHaveBeenCalled();
	});

	it("skickar inget och markerar fältet när e-posten är ogiltig", async () => {
		const user = userEvent.setup();
		render(LoginView);
		await user.type(screen.getByLabelText("E-post"), "anna");
		await user.type(screen.getByLabelText("Lösenord"), "hemligt123");
		await user.click(screen.getByRole("button", { name: "Logga in" }));

		expect(mockedPost).not.toHaveBeenCalled();
		expect(
			screen.getByText(AUTHENTICATION_MESSAGES.email.invalid),
		).toBeInTheDocument();
		expect(screen.getByLabelText("E-post")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(screen.getByLabelText("E-post")).toHaveFocus();
	});

	it("tar bort felet så fort fältet är rättat", async () => {
		const user = userEvent.setup();
		render(LoginView);
		await user.type(screen.getByLabelText("E-post"), "anna");
		await user.type(screen.getByLabelText("Lösenord"), "hemligt123");
		await user.click(screen.getByRole("button", { name: "Logga in" }));
		expect(
			screen.getByText(AUTHENTICATION_MESSAGES.email.invalid),
		).toBeInTheDocument();

		await user.type(screen.getByLabelText("E-post"), "@example.com");

		expect(
			screen.queryByText(AUTHENTICATION_MESSAGES.email.invalid),
		).not.toBeInTheDocument();
		expect(screen.getByLabelText("E-post")).toHaveAttribute(
			"aria-invalid",
			"false",
		);
	});

	it("sparar token i minnet och inte i localStorage, och skickar användaren tillbaka till sidan som efterfrågades", async () => {
		mockedPost.mockResolvedValue({
			body: {
				token: "jwt-from-api",
				user: {
					createdAt: "",
					displayName: "scotty",
					email: "Scott.Thomas@Scottymail.com",
					firstName: "Scott",
					id: 1,
					lastName: "Thomas",
					role: "member",
				},
			},
			status: 200,
		});
		const user = userEvent.setup();
		render(LoginView);
		await fillAndSubmit(user);

		expect(mockedPost).toHaveBeenCalledWith("/auth/login", {
			email: "anna.pyttipanna@example.com",
			password: "hemligt123",
		});
		expect(getToken()).toBe("jwt-from-api");
		expect(useAuthStore().user?.displayName).toBe("scotty");
		expect(localStorage.length).toBe(0);
		expect(push).toHaveBeenCalledWith("/turer/1/bild");
	});
});
