const required = (name) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Miljövariabeln (env) ${name} saknas`);
	}
	return value;
};

export const config = {
	cmsCacheSeconds: Number(process.env["CMS_CACHE_SECONDS"] ?? 60),
	cmsDeliveryToken: process.env["CONTENTFUL_DELIVERY_TOKEN"] ?? "",
	cmsEnvironment: process.env["CONTENTFUL_ENVIRONMENT"] ?? "master",
	cmsPreviewToken: process.env["CONTENTFUL_PREVIEW_TOKEN"] ?? "",
	cmsSpaceId: process.env["CONTENTFUL_SPACE_ID"] ?? "",
	cmsWebhookSecret: process.env["CMS_WEBHOOK_SECRET"] ?? "",
	gitSha: process.env["GIT_SHA"] ?? "dev",
	imageFunctionKey: process.env["IMAGE_FUNCTION_KEY"] ?? "",
	imageFunctionUrl: process.env["IMAGE_FUNCTION_URL"] ?? "",
	jwtSecret: required("JWT_SECRET"),
	mongodbUrl: required("MONGODB_URL"),
	port: Number(process.env["PORT"] ?? 4000),
	postgresUrl: required("POSTGRES_URL"),
	uploadDir: process.env["UPLOAD_DIR"] ?? "./uploads",
};
