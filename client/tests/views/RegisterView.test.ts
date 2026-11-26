import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/vue";
import { AUTHENTICATION_MESSAGES, PASSWORD_MIN_LENGTH } from "@utpost/shared";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { post } from "../../src/api.js";
import { useAuthStore } from "../../src/stores/authentication.js";
import RegisterView from "../../src/views/RegisterView.vue";

vi.mock("../../src/api.js", () => ({ post: vi.fn() }));
vi.mock("vue-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("vue-router")>()),
	useRoute: () => ({ query: {} }),
	useRouter: () => ({ push: vi.fn() }),
}));
const mockedPost = vi.mocked(post);

const renderView = () => {
	return render(RegisterView, {
		global: {
			stubs: { RouterLink: { template: '<a href="/logga-in"><slot /></a>' } },
		},
	});
};

const fillForm = async (
	user: ReturnType<typeof userEvent.setup>,
	password: string,
) => {
	await user.type(screen.getByLabelText("Förnamn"), "Anna");
	await user.type(screen.getByLabelText("Efternamn"), "Svensson");
	await user.type(screen.getByLabelText("Användarnamn"), "anna");
	await user.type(screen.getByLabelText("E-post"), "anna@example.com");
	await user.type(screen.getByLabelText("Lösenord"), password);
	await user.click(screen.getByRole("button", { name: "Skapa konto" }));
};

describe("RegisterView", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useAuthStore().logout();
		mockedPost.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	it("skickar inget och visar felet under lösenordet när det är för kort", async () => {
		const user = userEvent.setup();
		renderView();
		await fillForm(user, "kort");

		expect(mockedPost).not.toHaveBeenCalled();
		expect(
			screen.getByText(
				AUTHENTICATION_MESSAGES.password.tooShort(PASSWORD_MIN_LENGTH),
			),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Lösenord")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
	});

	it("visar en länk till inloggningen när e-posten redan finns", async () => {
		mockedPost.mockResolvedValue({
			body: {
				error: "e-posten används redan",
				issues: [{ message: "e-posten används redan", path: "email" }],
			},
			status: 409,
		});
		const user = userEvent.setup();
		renderView();
		await fillForm(user, "correct-horse-battery-staple");

		expect(
			await screen.findByRole("link", {
				name: AUTHENTICATION_MESSAGES.conflict.email.linkText,
			}),
		).toHaveAttribute("href", "/logga-in");
		expect(screen.getByLabelText("E-post")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
	});

	it("tar bort e-postfelet från API:et när användaren ändrar e-posten", async () => {
		mockedPost.mockResolvedValue({
			body: {
				error: "e-posten används redan",
				issues: [{ message: "e-posten används redan", path: "email" }],
			},
			status: 409,
		});
		const user = userEvent.setup();
		renderView();
		await fillForm(user, "correct-horse-battery-staple");
		await screen.findByRole("link", {
			name: AUTHENTICATION_MESSAGES.conflict.email.linkText,
		});

		await user.type(screen.getByLabelText("E-post"), "x");

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.getByLabelText("E-post")).toHaveAttribute(
			"aria-invalid",
			"false",
		);
	});
});
