// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/client/src/views/HomeView.test.ts

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/vue";
import { describe, expect, it, vi } from "vitest";
import { gql } from "../../src/graphql";
import HomeView from "../../src/views/HomeView.vue";

vi.mock("../../src/graphql", () => ({ gql: vi.fn() }));

const mockedGql = vi.mocked(gql);

const renderView = () =>
	render(HomeView, {
		global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
	});

describe("HomeView", () => {
	it("visar startsidan från ett enda GraphQL-anrop", async () => {
		mockedGql.mockResolvedValue({
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
		});

		renderView();

		expect(
			await screen.findByText("1 guider i 2 landskap."),
		).toBeInTheDocument();
		expect(screen.getByText("Kvällstur")).toBeInTheDocument();
		expect(screen.getByText(/8\.4\s+km/)).toBeInTheDocument();
		expect(mockedGql).toHaveBeenCalledTimes(1);
	});

	it("visar felet när GraphQL svarar med errors", async () => {
		mockedGql.mockRejectedValue(
			new Error('Cannot query field "titel" on type "Guide".'),
		);

		renderView();

		const message = await screen.findByText(/Cannot query field/);

		expect(message).toHaveAttribute("aria-live", "assertive");
	});
});
