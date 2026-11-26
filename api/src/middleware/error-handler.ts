import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

// body-parser sätter `type` på sina fel, till exempel "entity.too.large".
const readErrorType = (error: unknown): string | null => {
	if (
		error instanceof Error &&
		"type" in error &&
		typeof error.type === "string"
	) {
		return error.type;
	} else {
		return null;
	}
};

const readErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	} else {
		return String(error);
	}
};

// Express identifierar felhanterare genom att de har fyra parametrar, så _next måste finnas med även om den inte används.
export const errorHandler = (
	error: unknown,
	request: Request,
	response: Response,
	_next: NextFunction,
): void => {
	if (error instanceof ZodError) {
		response.status(400).json({
			error: "ogiltig indata", // YEAH!
			issues: error.issues.map((issue) => ({
				message: issue.message,
				path: issue.path.map(String).join("."),
			})),
		});
		return;
	}

	const errorType = readErrorType(error);
	if (errorType === "entity.parse.failed") {
		response.status(400).json({ error: "ogiltig JSON" });
		return;
	}
	if (errorType === "entity.too.large") {
		response.status(413).json({ error: "för stor request" });
		return;
	}

	console.error(
		`${request.method} ${request.originalUrl}: ${readErrorMessage(error)}`,
	);
	response.status(500).json({ error: "internt fel" });
};
