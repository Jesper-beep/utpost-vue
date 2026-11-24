import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/vue";
import { afterEach, describe, expect, it } from "vitest";
import NoticeList from "../../src/components/NoticeList.vue";
import type { Notice } from "../../src/lib/notices.js";

const createNotice = (extra: Partial<Notice> = {}): Notice => ({
	body: [
		{
			kind: "paragraph",
			runs: [{ bold: false, href: null, italic: false, text: "Bron lagas." }],
		},
	],
	guideSlug: null,
	id: "n1",
	level: "varning",
	status: "published",
	title: "Leden är avstängd",
	...extra,
});

const renderList = (notices: Notice[]) =>
	render(NoticeList, {
		global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
		props: { notices },
	});

afterEach(cleanup);

describe("NoticeList", () => {
	it("visar rubrik och text, och nivån i klassnamnet", () => {
		renderList([createNotice()]);

		expect(
			screen.getByRole("heading", { name: "Leden är avstängd" }),
		).toBeInTheDocument();
		expect(screen.getByText("Bron lagas.")).toBeInTheDocument();
		expect(screen.getByRole("article")).toHaveClass(
			"notice-list__item--varning",
		);
	});

	it("märker ut det som inte är publicerat", () => {
		renderList([
			createNotice({ id: "n2", status: "draft", title: "Ny led i vår" }),
			createNotice({ id: "n3", status: "changed", title: "Välkommen" }),
		]);

		expect(screen.getByText("Utkast")).toBeInTheDocument();
		expect(screen.getByText("Ändrad, inte publicerad")).toBeInTheDocument();
	});

	it("länkar till guiden när notisen gäller en guide", () => {
		renderList([createNotice({ guideSlug: "norra-leden-7" })]);

		expect(screen.getByText("den här guiden")).toBeInTheDocument();
	});

	it("visar ingenting alls utan notiser", () => {
		renderList([]);

		expect(screen.queryByRole("region")).toBeNull();
	});
});
