const required = (name) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Miljövariabeln (env) ${name} saknas`);
	}
	return value;
};

export const config = {
	gitSha: process.env["GIT_SHA"] ?? "dev",
	imageFunctionKey: process.env["IMAGE_FUNCTION_KEY"] ?? "",
	imageFunctionUrl: process.env["IMAGE_FUNCTION_URL"] ?? "",
	jwtSecret: required("JWT_SECRET"),
	mongodbUrl: required("MONGODB_URL"),
	port: Number(process.env["PORT"] ?? 4000),
	postgresUrl: required("POSTGRES_URL"),
	uploadDir: process.env["UPLOAD_DIR"] ?? "./uploads",
};
