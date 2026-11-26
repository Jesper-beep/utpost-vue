import { type ApiIssue, AUTHENTICATION_MESSAGES } from "@utpost/shared";

// Status 0 betyder att inget svar kom från API:et, till exempel vid nätverksfel.
export class AuthenticationError extends Error {
	readonly issues: ApiIssue[];
	readonly status: number;

	constructor(status: number, issues: ApiIssue[] = []) {
		super(`Autentiseringen misslyckades med status ${status}`);
		this.issues = issues;
		this.status = status;
	}
}

export const getFormMessage = (status: number): string => {
	if (status === 401) {
		return AUTHENTICATION_MESSAGES.form.invalidCredentials;
	}
	if (status === 429) {
		return AUTHENTICATION_MESSAGES.form.tooManyAttempts;
	}
	return AUTHENTICATION_MESSAGES.form.failed;
};
