import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import router from "../../router/index.js";
import MainHeader from "../../src/components/MainHeader.vue";
import { setToken } from "../../src/lib/token.js";
import { useAuthStore } from "../../src/stores/authentication.js";

let pinia: Pinia;

const renderHeader = () =>
	render(MainHeader, {
		global: {
			plugins: [pinia, router],
		},
	});

describe("MainHeader", () => {
	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
		setToken(null);
		await router.push("/my-fingers-into-my-eyes");
	});

	afterEach(cleanup);

	it("visar Logga in och Skapa konto när man är utloggad", () => {
		renderHeader();

		expect(screen.getByRole("link", { name: "Logga in" })).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Skapa konto" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Logga ut" }),
		).not.toBeInTheDocument();
	});

	it("visar namnet och Logga ut när man är inloggad, och loggar ut", async () => {
		setToken("test-token");
		useAuthStore().user = {
			createdAt: "",
			displayName: "michaelscarn",
			email: "michael.scott@michaelscottpapercompany.com",
			firstName: "Michael",
			id: 1,
			lastName: "Scott",
			role: "member",
		};

		renderHeader();

		expect(
			screen.getByRole("link", { name: "michaelscarn" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "Logga in" }),
		).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole("button", { name: "Logga ut" }));

		expect(
			await screen.findByRole("link", { name: "Logga in" }),
		).toBeInTheDocument();
		await vi.waitFor(() => {
			expect(router.currentRoute.value.path).toBe("/");
		});
	});
});
