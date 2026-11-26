import { AUTHENTICATION_MESSAGES, PASSWORD_MIN_LENGTH } from "@utpost/shared";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../src/db/postgres.ts";
import { users } from "../../../src/db/schema/index.ts";
import {
	callApi,
	issuesSchema,
	readJson,
	startTestServer,
	stopTestServer,
} from "../../helpers/api.ts";

beforeAll(startTestServer);
afterAll(stopTestServer);

describe("A07 Authentication Failures - registreringen", () => {
	it("registrering med för kort lösenord ger 400 med vad som var fel", async () => {
		const response = await callApi("/api/auth/signup", {
			body: {
				displayName: "ny",
				email: "ny@example.com",
				firstName: "Ny",
				lastName: "Användare",
				password: "kort",
			},
			method: "POST",
		});
		expect(response.status).toBe(400);
		const responseBody = await readJson(response, issuesSchema);
		expect(responseBody.error).toBe("ogiltig indata");
		expect(responseBody.issues[0]?.path).toBe("password");
		expect(responseBody.issues[0]?.message).toBe(
			AUTHENTICATION_MESSAGES.password.tooShort(PASSWORD_MIN_LENGTH),
		);
	});

	it("registrering skapar kontot, och e-post eller användarnamn som redan finns ger 409", async () => {
		const newAccount = {
			displayName: "testkonto",
			email: "testkonto@example.com",
			firstName: "Test",
			lastName: "Konto",
			password: "correct-horse-battery-staple",
		};
		try {
			const created = await callApi("/api/auth/signup", {
				body: newAccount,
				method: "POST",
			});
			expect(created.status).toBe(201);
			expect(await created.text()).not.toContain("passwordHash");

			const sameEmail = await callApi("/api/auth/signup", {
				body: { ...newAccount, displayName: "another" },
				method: "POST",
			});
			expect(sameEmail.status).toBe(409);
			const sameEmailBody = await readJson(sameEmail, issuesSchema);
			expect(sameEmailBody.error).toBe("e-posten används redan");
			expect(sameEmailBody.issues[0]?.path).toBe("email");

			const sameDisplayName = await callApi("/api/auth/signup", {
				body: { ...newAccount, email: "anna.pyttipanna@example.com" },
				method: "POST",
			});
			expect(sameDisplayName.status).toBe(409);
			const sameDisplayNameBody = await readJson(sameDisplayName, issuesSchema);
			expect(sameDisplayNameBody.error).toBe("användarnamnet används redan");
			expect(sameDisplayNameBody.issues[0]?.path).toBe("displayName");
		} finally {
			await db.delete(users).where(eq(users.email, newAccount.email));
		}
	});
});
