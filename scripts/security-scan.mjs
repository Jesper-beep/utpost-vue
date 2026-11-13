// Lokal skanning med samma verktyg som jobbet Säkerhet i pipelinen: Trivy och ZAP genom Docker. Starta först sajten med npm run docker:up.

import { spawnSync } from "node:child_process";

const TRIVY_IMAGE = "ghcr.io/aquasecurity/trivy:0.76.2";
const ZAP_IMAGE = "ghcr.io/zaproxy/zaproxy:stable";
const ZAP_TARGET = "http://host.docker.internal:3001";
const IMAGES_TO_SCAN = ["utpost-api", "utpost-client"];
const PROJECT_DIRECTORY = process.cwd();
const TRIVY_OPTIONS = [
	"--severity",
	"HIGH,CRITICAL",
	"--ignore-unfixed",
	"--exit-code",
	"1",
	"--ignorefile",
	"/src/.trivyignore",
];

const mount = (hostPath, containerPath) => [
	"-v",
	`${hostPath}:${containerPath}`,
];

const runDocker = (dockerArguments) => {
	const result = spawnSync("docker", dockerArguments, { stdio: "inherit" });

	if (result.error) {
		console.error(
			"security-scan: Docker går inte att köra. Starta Docker och försök igen.",
		);
		return 1;
	}

	return result.status ?? 1;
};

const scanRepository = () =>
	runDocker([
		"run",
		"--rm",
		...mount(PROJECT_DIRECTORY, "/src"),
		...mount("trivy-cache", "/root/.cache"),
		TRIVY_IMAGE,
		"fs",
		...TRIVY_OPTIONS,
		"/src",
	]);

const scanImage = (imageName) =>
	runDocker([
		"run",
		"--rm",
		...mount("/var/run/docker.sock", "/var/run/docker.sock"),
		...mount(`${PROJECT_DIRECTORY}/.trivyignore`, "/src/.trivyignore:ro"),
		...mount("trivy-cache", "/root/.cache"),
		TRIVY_IMAGE,
		"image",
		...TRIVY_OPTIONS,
		imageName,
	]);

const scanWithTrivy = () => {
	const statuses = [scanRepository(), ...IMAGES_TO_SCAN.map(scanImage)];

	return statuses.find((status) => status !== 0) ?? 0;
};

const scanWithZap = () =>
	runDocker([
		"run",
		"--rm",
		"--add-host=host.docker.internal:host-gateway",
		...mount(`${PROJECT_DIRECTORY}/.zap`, "/zap/wrk:rw"),
		ZAP_IMAGE,
		"zap-baseline.py",
		"-t",
		ZAP_TARGET,
		"-c",
		"rules.tsv",
	]);

const scans = { trivy: scanWithTrivy, zap: scanWithZap };
const scanName = process.argv[2];
const scan = scans[scanName];

if (!scan) {
	console.error(
		`security-scan: okänd skanning "${scanName}". Välj trivy eller zap.`,
	);
	process.exit(1);
}

const status = scan();

console.log(`security-scan: ${scanName} klar, status ${status}`);
process.exit(status);
