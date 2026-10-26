// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/client/src/views/HomeView.test.ts

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/vue";
import { useQuery } from "@urql/vue";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
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

const renderView = () =>
	render(HomeView, {
		global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
	});

describe("HomeView", () => {
	it("visar startsidan från en enda fråga", async () => {
		mockQueryResult({
			data: {
				guides: [
					{
						body_html: "<p>En lång fjällvandring</p>",
						difficulty: "svår",
						id: "1",
						length_km: 18,
						region: "Lappland",
						slug: "kebnekaise",
						title: "Kebnekaise",
					},
				],
				popularGuides: [
					{
						body_html: "<p>En lång fjällvandring</p>",
						difficulty: "svår",
						id: "1",
						length_km: 18,
						region: "Lappland",
						slug: "kebnekaise",
						title: "Kebnekaise",
					},
				],
				regions: ["Lappland", "Småland"],
				tours: [{ distance_m: 8400, id: "7", title: "Kvällstur" }],
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
});
