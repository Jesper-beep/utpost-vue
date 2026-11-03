import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/vue";
import { useQuery } from "@urql/vue";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import ProfileArticle from "../../src/components/ProfileArticle.vue";

vi.mock("@urql/vue", () => ({ useQuery: vi.fn() }));
const mockedUseQuery = vi.mocked(useQuery);

const svar = (data: unknown, error?: Error) =>
	({
		data: ref(data),
		error: ref(error),
		fetching: ref(false),
	}) as ReturnType<typeof useQuery>;

const renderArticle = () =>
	render(ProfileArticle, {
		global: {
			plugins: [createPinia()],
			stubs: { RouterLink: { template: "<a><slot /></a>" } },
		},
	});

const loggaIn = () =>
	localStorage.setItem(
		"user",
		JSON.stringify({
			display_name: "Anna Berg",
			email: "anna@example.com",
			id: 1,
			role: "member",
		}),
	);

describe("ProfileArticle", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("säger till när man inte är inloggad", () => {
		mockedUseQuery.mockReturnValue(svar({ tours: [] }));
		renderArticle();

		expect(screen.getByText("Du är inte inloggad.")).toBeInTheDocument();
	});

	it("visar bara den inloggades egna turer", () => {
		loggaIn();
		mockedUseQuery.mockReturnValue(
			svar({
				tours: [
					{ distance_m: 8400, id: "7", title: "Kvällstur", user: { id: "1" } },
					{
						distance_m: 5000,
						id: "8",
						title: "Någon annans",
						user: { id: "2" },
					},
				],
			}),
		);
		renderArticle();

		expect(screen.getByText("Anna Berg")).toBeInTheDocument();
		expect(screen.getByText("Mina turer (1)")).toBeInTheDocument();
		expect(screen.getByText("Kvällstur")).toBeInTheDocument();
		expect(screen.queryByText("Någon annans")).not.toBeInTheDocument();
	});

	it("visar felet när turerna inte kan hämtas", () => {
		loggaIn();
		mockedUseQuery.mockReturnValue(svar(undefined, new Error("Nätverksfel")));
		renderArticle();

		expect(screen.getByText(/Nätverksfel/)).toHaveAttribute(
			"aria-live",
			"assertive",
		);
	});
});
