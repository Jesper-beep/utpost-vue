import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { pool } from "./db/client.js";
import { mongo } from "./db/mongo.js";
import { handleUnhandledRejection } from "./lib/unhandledRejection.js";
import { authRouter } from "./routes/auth.js";
import { guidesRouter } from "./routes/guides.js";
import { photosRouter } from "./routes/photos.ts";
import { toursRouter } from "./routes/tours.js";

const app = express();

app.use(cors());
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
	res.status(ok ? 200 : 503).json({ mongodb, ok, postgres });
});

app.use("/api/auth", authRouter);
app.use("/api/guides", guidesRouter);
app.use("/api/tours", toursRouter);
app.use("/api/photos", photosRouter);
app.use("/uploads", express.static(config.uploadDir));

app.listen(config.port, () => {
	console.log(`API lyssnar på http://localhost:${config.port}`);
});

// Servern dog i produktion en fredag när någon skrev in ett ogiltigt id.
// Det här håller den vid liv. Anropet får inget svar, men resten funkar. /marcus 2022-09-02
process.on("unhandledRejection", (err) => {
	handleUnhandledRejection(err);
});
