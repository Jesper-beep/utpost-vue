// Godtar bara adresser på vår egen sajt, så att ?till inte kan skicka användaren vidare till en annan sajt.
export const getRedirectPath = (requestedPath: unknown): string => {
	if (
		typeof requestedPath === "string" &&
		requestedPath.startsWith("/") &&
		!requestedPath.startsWith("//")
	) {
		return requestedPath;
	} else {
		return "/";
	}
};
