import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { guidesRouter } from "./routes/guides.js";
import { photosRouter } from "./routes/photos.js";
import { toursRouter } from "./routes/tours.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, version: "1.4.2" }));

app.use("/api/auth", authRouter);
app.use("/api/guides", guidesRouter);
app.use("/api/tours", toursRouter);
app.use("/api/photos", photosRouter);

app.listen(config.port, () => {
	console.log(`API lyssnar på http://localhost:${config.port}`);
});

// Servern dog i produktion en fredag när någon skrev in ett ogiltigt id.
// Det här håller den vid liv. Anropet får inget svar, men resten funkar. /marcus 2022-09-02
process.on("unhandledRejection", (err) => {
	console.error("Ohanterat fel:", err.message);
});
