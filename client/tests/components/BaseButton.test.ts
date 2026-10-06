import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import router from "../../router/index.js";
import BaseButton from "../../src/components/BaseButton.vue";

describe("BaseButton", () => {
	it("visar texten från slotten", () => {
		const wrapper = mount(BaseButton, {
			slots: {
				default: "Logga in",
			},
		});
		expect(wrapper.text()).toBe("Logga in");
	});

	it("är en button med type=button som standard", () => {
		const wrapper = mount(BaseButton);
		expect(wrapper.element.localName).toBe("button");
		expect(wrapper.attributes("type")).toBe("button");
	});

	it("använder type=submit när det väljs", () => {
		const wrapper = mount(BaseButton, {
			props: {
				type: "submit",
			},
		});
		expect(wrapper.attributes("type")).toBe("submit");
	});

	it("är primary som standard", () => {
		const wrapper = mount(BaseButton);
		expect(wrapper.classes()).toContain("button--primary");
	});

	it("får klassen för vald variant", () => {
		const wrapper = mount(BaseButton, {
			props: {
				variant: "secondary",
			},
		});
		expect(wrapper.classes()).toContain("button--secondary");
		expect(wrapper.classes()).not.toContain("button--primary");
	});

	it("är en länk när to är satt", () => {
		const wrapper = mount(BaseButton, {
			global: {
				plugins: [router],
			},
			props: {
				to: "/guider",
			},
		});
		expect(wrapper.element.localName).toBe("a");
	});
});
