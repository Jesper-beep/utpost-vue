import express from "express";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import { config } from "./config.js";
import { pool } from "./db/client.js";
import { mongo } from "./db/mongo.js";
import { yoga } from "./graphql/server.js";
import { authRouter } from "./routes/auth.js";
import { cmsRouter } from "./routes/cms.js";
import { guidesRouter } from "./routes/guides.js";
import { noticesRouter } from "./routes/notices.js";
import { photosRouter } from "./routes/photos.ts";
import { toursRouter } from "./routes/tours.js";

const restLimiter = rateLimit({
	limit: 10,
	message: { error: "Too many attempts, please try again later." },
	skip: () => ["development", "test"].includes(process.env["NODE_ENV"]),
	statusCode: 429,
	windowMs: 15 * 60 * 1000,
});

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 2);

app.use(yoga.graphqlEndpoint, yoga);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
	const check = async (fn) => {
		try {
			await fn();
			return "ok";
		} catch (err) {
			return `fel: ${err.message}`;
		}
	};
	const postgres = await check(() => pool.query("select 1"));
	const mongodb = await check(async () => {
		await mongo.connect();
		await mongo.db().command({ ping: 1 });
	});
	const ok = postgres === "ok" && mongodb === "ok";
	res
		.status(ok ? 200 : 503)
		.json({ mongodb, ok, postgres, sha: config.gitSha });
});

// Monteras före hastighetsbegränsningen. Annars stoppas Contentful efter tio anrop på 15 minuter.
app.use("/api/cms", cmsRouter);

app.use("/api", restLimiter);

app.use("/api/auth", authRouter);
app.use("/api/guides", guidesRouter);
app.use("/api/notices", noticesRouter);
app.use("/api/tours", toursRouter);
app.use("/api/photos", photosRouter);
app.use("/uploads", express.static(config.uploadDir));

app.use((error, req, res, _next) => {
	if (error instanceof ZodError) {
		return res.status(400).json({
			error: "ogiltig indata",
			issues: error.issues.map((issue) => ({
				message: issue.message,
				path: issue.path.join("."),
			})),
		});
	}
	if (error.type === "entity.parse.failed") {
		return res.status(400).json({ error: "ogiltig JSON" });
	}
	if (error.type === "entity.too.large") {
		return res.status(413).json({ error: "för stor request" });
	}
	console.error(`${req.method} ${req.originalUrl}: ${error.message}`);
	res.status(500).json({ error: "internt fel" });
});
