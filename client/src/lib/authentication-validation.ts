import { loginSchema, registerSchema } from "@utpost/shared";

export const AUTHENTICATION_FIELDS = [
	"displayName",
	"email",
	"firstName",
	"lastName",
	"password",
] as const;
export type AuthenticationField = (typeof AUTHENTICATION_FIELDS)[number];
export type FieldErrors = Partial<Record<AuthenticationField, string>>;
export type AuthenticationValues = Record<AuthenticationField, string>;
export type AuthenticationMode = "login" | "register";

interface Issue {
	message: string;
	path: unknown;
}

const isAuthenticationField = (
	value: unknown,
): value is AuthenticationField => {
	return AUTHENTICATION_FIELDS.some((field) => field === value);
};

// Varje fält får sitt första fel. Resten av felen för samma fält visas först när det första är rättat.
export const toFieldErrors = (issues: readonly Issue[]): FieldErrors => {
	const errors: FieldErrors = {};
	for (const issue of issues) {
		if (isAuthenticationField(issue.path) && errors[issue.path] === undefined) {
			errors[issue.path] = issue.message;
		}
	}
	return errors;
};

const getSchema = (
	mode: AuthenticationMode,
): typeof loginSchema | typeof registerSchema => {
	if (mode === "register") {
		return registerSchema;
	}
	return loginSchema;
};

// Samma scheman som API:et använder, så att webbläsaren och API:et alltid är överens om vad som är giltigt.
export const getFieldErrors = (
	mode: AuthenticationMode,
	values: AuthenticationValues,
): FieldErrors => {
	const result = getSchema(mode).safeParse(values);
	if (result.success) {
		return {};
	}
	return toFieldErrors(
		result.error.issues.map((issue) => ({
			message: issue.message,
			path: issue.path[0],
		})),
	);
};
