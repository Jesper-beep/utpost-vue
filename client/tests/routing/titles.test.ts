import { describe, expect, it } from "vitest";
import router, { routes } from "../../router/index.js";

const titles = routes.map((route) => route.meta.title);
const isUnique = (values: unknown[]) => new Set(values).size === values.length;
const toUrl = (path: string) => path.replace(/:\w+(\(.*\))?\*?/g, "x");

describe("pages", () => {
	it("varje sida har en sidtitel", () => {
		const missing = routes.filter((route) => !route.meta.title);
		expect(missing.map((route) => route.name)).toEqual([]);
	});

	it("varje sidtitel är unik", () => {
		expect(isUnique(titles)).toBe(true);
	});

	it("sidtitlar innehåller varken undefined, null eller onödiga mellanrum", () => {
		const bad = titles.filter((title) =>
			/^\s|\s$|\s{2}|\b(undefined|null)\b/i.test(title),
		);
		expect(bad).toEqual([]);
	});

	it.each(routes.map((route) => toUrl(route.path)))(
		"%s har ändelsen - Utpost",
		async (url) => {
			document.title = "";
			await router.push(url);
			expect(document.title).toMatch(/ - Utpost$/);
		},
	);
});
