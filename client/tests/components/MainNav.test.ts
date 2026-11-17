import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import router from "../../router/index.js";
import MainNav from "../../src/components/MainNav.vue";

const renderNav = () =>
	render(MainNav, {
		global: {
			plugins: [router],
		},
	});

describe("MainNav", () => {
	afterEach(cleanup);

	it("öppnar och stänger menyn med knappen", async () => {
		renderNav();
		const toggle = screen.getByRole("button", { name: "Huvudmeny" });
		expect(toggle).toHaveAttribute("aria-expanded", "false");

		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "true");

		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "false");
	});

	it("stänger menyn när sidan byts", async () => {
		renderNav();
		const toggle = screen.getByRole("button", { name: "Huvudmeny" });
		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "true");

		await router.push("/my-fingers-into-my-eyes");
		await nextTick();

		expect(toggle).toHaveAttribute("aria-expanded", "false");
	});
});
