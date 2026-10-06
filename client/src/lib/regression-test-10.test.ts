import { expect, it, vi } from "vitest";
import { handleUnhandledRejection } from "../../../api/src/lib/unhandledRejection.js";

it("loggar ett ohanterat fel med console.error", () => {
	const logger = { error: vi.fn() };

	handleUnhandledRejection(new Error("databasen svarar inte"), logger);

	expect(logger.error).toHaveBeenCalledWith(
		"Ohanterat fel:",
		"databasen svarar inte",
	);
});
