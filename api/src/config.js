const required = (name) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Miljövariabeln (env) ${name} saknas`);
	}
	return value;
};

export const config = {
	databaseUrl: required("DATABASE_URL"),
	jwtSecret: required("JWT_SECRET"),
	port: Number(process.env["PORT"] ?? 4000),
	uploadDir: process.env["UPLOAD_DIR"] ?? "./uploads",
};
