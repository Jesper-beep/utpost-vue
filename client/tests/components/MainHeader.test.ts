import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import router from "../../router/index.js";
import MainHeader from "../../src/components/MainHeader.vue";

const renderHeader = () =>
	render(MainHeader, {
		global: {
			plugins: [createPinia(), router],
		},
	});

describe("MainHeader", () => {
	beforeEach(async () => {
		localStorage.clear();
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
		localStorage.setItem("token", "test-token");
		localStorage.setItem(
			"user",
			JSON.stringify({
				display_name: "Michael Scott",
				email: "michael.scott@michaelscottpapercompany.com",
				id: 1,
				role: "member",
			}),
		);

		renderHeader();

		expect(screen.getByRole("link", { name: "Michael Scott" })).toBeInTheDocument();
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
