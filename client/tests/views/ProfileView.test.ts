import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/vue";
import { useQuery } from "@urql/vue";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import ProfileView from "../../src/views/ProfileView.vue";

vi.mock("@urql/vue", () => ({ useQuery: vi.fn() }));

const mockedUseQuery = vi.mocked(useQuery);

const mockTours = (tours: unknown[]) => {
	mockedUseQuery.mockReturnValue({
		data: ref({ tours }),
		fetching: ref(false),
	} as unknown as ReturnType<typeof useQuery>);
};

const renderView = () =>
	render(ProfileView, {
		global: {
			plugins: [createPinia()],
			stubs: { RouterLink: { template: "<a><slot /></a>" } },
		},
	});

describe("ProfileView", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("säger till när man inte är inloggad", () => {
		mockTours([]);

		renderView();

		expect(screen.getByText("Du är inte inloggad.")).toBeInTheDocument();
	});

	it("visar bara den inloggades egna turer", () => {
		localStorage.setItem(
			"user",
			JSON.stringify({
				display_name: "Anna Berg",
				email: "anna@example.com",
				id: 1,
				role: "member",
			}),
		);
		mockTours([
			{ distanceM: 8400, id: "7", title: "Kvällstur", user: { id: "1" } },
			{ distanceM: 5000, id: "8", title: "Någon annans", user: { id: "2" } },
		]);

		renderView();

		expect(screen.getByText("Anna Berg")).toBeInTheDocument();
		expect(screen.getByText("Mina turer (1)")).toBeInTheDocument();
		expect(screen.getByText("Kvällstur")).toBeInTheDocument();
		expect(screen.queryByText("Någon annans")).not.toBeInTheDocument();
	});
});
