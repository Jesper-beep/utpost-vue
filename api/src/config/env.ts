const required = (name: string): string => {
	const value = process.env[name];
	if (value) {
		return value;
	} else {
		throw new Error(`Miljövariabeln (env) ${name} saknas`);
	}
};

const optional = (name: string, fallback: string): string => {
	const value = process.env[name];
	if (value === undefined) {
		return fallback;
	} else {
		return value;
	}
};

const RATE_LIMIT_DISABLED_ENVIRONMENTS = ["development", "test"];
const nodeEnv = optional("NODE_ENV", "production");

export const config = {
	cmsCacheSeconds: Number(optional("CMS_CACHE_SECONDS", "60")),
	cmsDeliveryToken: optional("CONTENTFUL_DELIVERY_TOKEN", ""),
	cmsEnvironment: optional("CONTENTFUL_ENVIRONMENT", "master"),
	cmsPreviewToken: optional("CONTENTFUL_PREVIEW_TOKEN", ""),
	cmsSpaceId: optional("CONTENTFUL_SPACE_ID", ""),
	cmsWebhookSecret: optional("CMS_WEBHOOK_SECRET", ""),
	gitSha: optional("GIT_SHA", "dev"),
	imageFunctionKey: optional("IMAGE_FUNCTION_KEY", ""),
	imageFunctionUrl: optional("IMAGE_FUNCTION_URL", ""),
	isRateLimitEnabled: !RATE_LIMIT_DISABLED_ENVIRONMENTS.includes(nodeEnv),
	jwtSecret: required("JWT_SECRET"),
	mongodbUrl: required("MONGODB_URL"),
	port: Number(optional("PORT", "4000")),
	postgresUrl: required("POSTGRES_URL"),
	seedOnStart: optional("SEED_ON_START", "") === "1",
	uploadDir: optional("UPLOAD_DIR", "./uploads"),
};
