const required = (name) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Miljövariabeln (env) ${name} saknas`);
	}
	return value;
};

export const config = {
	jwtSecret: required("JWT_SECRET"),
	mongodbUrl: required("MONGODB_URL"),
	port: Number(process.env["PORT"] ?? 4000),
	postgresUrl: required("POSTGRES_URL"),
	uploadDir: process.env["UPLOAD_DIR"] ?? "./uploads",
};
