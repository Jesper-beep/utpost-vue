import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
	documents: ["src/**/*.vue", "src/**/*.ts", "!src/gql/**"],
	generates: {
		"./src/gql/": {
			config: { useTypeImports: true },
			preset: "client",
			presetConfig: { fragmentMasking: false },
		},
	},
	schema: "../api/src/graphql/schema.js",
};

export default config;
