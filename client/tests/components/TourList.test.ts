import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/vue";
import { useQuery } from "@urql/vue";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import TourList from "../../src/components/TourList.vue";

vi.mock("@urql/vue", () => ({ useQuery: vi.fn() }));
const mockedUseQuery = vi.mocked(useQuery);

const svar = (data: unknown, error?: Error) =>
	({
		data: ref(data),
		error: ref(error),
		fetching: ref(false),
	}) as ReturnType<typeof useQuery>;

const renderList = () =>
	render(TourList, {
		global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
	});

describe("TourList", () => {
	it("visar turerna med vem som gick och vilken guide", async () => {
		mockedUseQuery.mockReturnValue(
			svar({
				tours: [
					{
						distanceM: 12345,
						guide: { title: "Kebnekaise" },
						id: "1",
						photos: [{ id: "1" }, { id: "2" }],
						title: "Morgontur",
						user: { displayName: "Sara Ek" },
					},
					{
						distanceM: 8400,
						guide: null,
						id: "2",
						photos: [],
						title: "Kvällstur",
						user: { displayName: "Erik Lind" },
					},
				],
			}),
		);
		renderList();

		expect(await screen.findByText("Morgontur")).toBeInTheDocument();
		expect(screen.getByText("Sara Ek")).toBeInTheDocument();
		expect(screen.getByText("Kebnekaise")).toBeInTheDocument();
		expect(screen.getByText("12.3 km")).toBeInTheDocument();
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("visar en laddtext medan turerna hämtas", () => {
		mockedUseQuery.mockReturnValue({
			...svar(undefined),
			fetching: ref(true),
		} as unknown as ReturnType<typeof useQuery>);
		renderList();

		expect(screen.getByText("Laddar turer...")).toBeInTheDocument();
	});
});
