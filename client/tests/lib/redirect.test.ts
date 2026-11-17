import { describe, expect, it } from "vitest";
import { getRedirectPath } from "../../src/lib/redirect.js";

describe("getRedirectPath", () => {
	it.each(["/profil", "/turer/1", "/guider?sok=berg"])(
		"godtar adressen %s på den egna sajten",
		(path) => {
			expect(getRedirectPath(path)).toBe(path);
		},
	);

	it.each(["https://www.svenska-shrekfans.se", "//test.se", "profil", ""])(
		"skickar till startsidan för adressen %s",
		(path) => {
			expect(getRedirectPath(path)).toBe("/");
		},
	);

	it.each([undefined, null, ["/profil"]])(
		"skickar till startsidan när ?till inte är en text (%j)",
		(value) => {
			expect(getRedirectPath(value)).toBe("/");
		},
	);
});
