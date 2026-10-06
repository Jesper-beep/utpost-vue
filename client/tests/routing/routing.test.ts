import { describe, expect, it } from "vitest";
import router, { routes } from "../../router/index.js";

const isUnique = (values: unknown[]) => new Set(values).size === values.length;
const toUrl = (path: string) => path.replace(/:\w+(\(.*\))?\*?/g, "x");

describe("routing", () => {
	it("varje länk är unik", () => {
		expect(isUnique(routes.map((route) => route.path))).toBe(true);
	});

	it("varje namn på en länk är unikt", () => {
		expect(isUnique(routes.map((route) => route.name))).toBe(true);
	});

	it("varje länk använder bara gemener och inga mellanrum", () => {
		const bad = routes.filter(
			(route) => !/^\/[a-z0-9\-/]*$/.test(toUrl(route.path)),
		);
		expect(bad.map((route) => route.path)).toEqual([]);
	});

	it("okända länkar leder till NotFound", async () => {
		await router.push("/my-fingers-into-my-eyes");
		expect(router.currentRoute.value.name).toBe("NotFound");
	});
});
