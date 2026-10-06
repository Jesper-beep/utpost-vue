// Varje sida har en sidtitel
// Varje sidtitel är unik
// Varje länk/rutt (slug) är unik
// Varje namn på/för en länk/rutt är unik(t)
// Varje länk använder bara gemener
// Sidtitlar får inte innehålla undefined, null eller onödiga mellanrum
// Alla sidor har ändelsen "- Utpost"

import { describe, expect, it } from "vitest";
import router, { routes } from "../router/index.js";

const titles = routes.map((route) => route.meta.title);
const isUnique = (values) => new Set(values).size === values.length;
const toUrl = (path) => path.replace(/:\w+(\(.*\))?\*?/g, "x");

describe("pages", () => {
	// Varje sida har en sidtitel
	it("every page has a title", () => {
		const missing = routes.filter((route) => !route.meta.title);
		expect(missing.map((route) => route.name)).toEqual([]);
	});

	// Varje sidtitel är unik
	it("titles are unique", () => {
		expect(isUnique(titles)).toBe(true);
	});

	// Varje länk/rutt (slug) är unik
	it("paths are unique", () => {
		expect(isUnique(routes.map((route) => route.path))).toBe(true);
	});

	// Varje namn på/för en länk/rutt är unik(t)
	it("route names are unique", () => {
		expect(isUnique(routes.map((route) => route.name))).toBe(true);
	});

	// Varje länk använder bara gemener
	it("paths are lowercase without spaces", () => {
		const bad = routes.filter(
			(route) => !/^\/[a-z0-9\-/]*$/.test(toUrl(route.path)),
		);
		expect(bad.map((route) => route.path)).toEqual([]);
	});

	// Sidtitlar får inte innehålla undefined, null eller onödiga mellanrum
	it("titles have no undefined, null or stray whitespace", () => {
		const bad = titles.filter((title) =>
			/^\s|\s$|\s{2}|\b(undefined|null)\b/i.test(title),
		);
		expect(bad).toEqual([]);
	});

	// Alla sidor har ändelsen "- Utpost"
	it.each(routes.map((route) => toUrl(route.path)))(
		"%s ends with - Utpost",
		async (url) => {
			document.title = "";
			await router.push(url);
			expect(document.title).toMatch(/ - Utpost$/);
		},
	);
});
