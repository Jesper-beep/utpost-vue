// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/client/src/views/HomeView.test.ts

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/vue";
import { useQuery } from "@urql/vue";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { setToken } from "../../src/lib/token.js";
import { useAuthStore } from "../../src/stores/auth.js";
import HomeView from "../../src/views/HomeView.vue";

vi.mock("@urql/vue", () => ({ useQuery: vi.fn() }));

const mockedUseQuery = vi.mocked(useQuery);

const mockQueryResult = (result: {
	data?: unknown;
	error?: { message: string };
}) => {
	mockedUseQuery.mockReturnValue({
		data: ref(result.data),
		error: ref(result.error),
		fetching: ref(false),
	} as unknown as ReturnType<typeof useQuery>);
};

let pinia: Pinia;

const renderView = () =>
	render(HomeView, {
		global: {
			plugins: [pinia],
			stubs: { RouterLink: { template: "<a><slot /></a>" } },
		},
	});

const logInAs = (role: "editor" | "member") => {
	setToken("test-token");
	useAuthStore().user = {
		createdAt: "",
		displayName: "ny152",
		email: "NNY152@AOL.com",
		firstName: "Joe",
		id: 1,
		lastName: "Fox",
		role,
	};
};

const guide = {
	difficulty: "svår",
	excerpt: "En lång fjällvandring",
	id: "1",
	lengthKm: 18,
	region: "Lappland",
	slug: "kebnekaise",
	title: "Kebnekaise",
};

const notice = {
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
	title: "Storforsbron är avstängd",
};

describe("HomeView", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		setToken(null);
	});

	afterEach(cleanup);

	it("visar startsidan från en enda fråga", async () => {
		mockQueryResult({
			data: {
				guides: [guide],
				popularGuides: [guide],
				regions: ["Lappland", "Småland"],
				tours: [{ distanceM: 8400, id: "7", title: "Kvällstur" }],
			},
		});

		renderView();

		expect(
			await screen.findByText("1 guider i 2 landskap."),
		).toBeInTheDocument();
		expect(screen.getByText("Kvällstur")).toBeInTheDocument();
		expect(screen.getByText(/8\.4\s+km/)).toBeInTheDocument();
		expect(mockedUseQuery).toHaveBeenCalledTimes(1);
	});

	it("visar felet när GraphQL svarar med errors", async () => {
		mockQueryResult({
			error: { message: 'Cannot query field "titel" on type "Guide".' },
		});

		renderView();

		const message = await screen.findByText(/Cannot query field/);

		expect(message).toHaveAttribute("aria-live", "assertive");
	});

	it("visar redaktionens notiser, men ingen kryssruta för en besökare", () => {
		mockQueryResult({
			data: {
				guides: [guide],
				notices: [notice],
				popularGuides: [guide],
				regions: ["Lappland"],
				tours: [],
			},
		});

		renderView();

		expect(
			screen.getByRole("heading", { name: "Storforsbron är avstängd" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("checkbox")).toBeNull();
	});

	it("ger en medlem ingen kryssruta, och en redaktör Förhandsgranska", () => {
		mockQueryResult({
			data: {
				guides: [],
				notices: [],
				popularGuides: [],
				regions: [],
				tours: [],
			},
		});

		logInAs("member");
		const asMember = renderView();
		expect(asMember.queryByRole("checkbox")).toBeNull();
		asMember.unmount();

		logInAs("editor");
		renderView();
		expect(
			screen.getByRole("checkbox", { name: "Förhandsgranska: visa utkast" }),
		).toBeInTheDocument();
	});
});
