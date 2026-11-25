import express from "express";
import { config } from "./config/env.ts";
import { yoga } from "./graphql/server.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { cmsRouter } from "./routes/cms/index.ts";
import { guidesRouter } from "./routes/guides/index.ts";
import { healthRouter } from "./routes/health/index.ts";
import { loginRouter } from "./routes/login/index.ts";
import { noticesRouter } from "./routes/notices/index.ts";
import { photosRouter } from "./routes/photos/index.ts";
import { signupRouter } from "./routes/signup/index.ts";
import { toursRouter } from "./routes/tours/index.ts";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 2);

app.use(yoga.graphqlEndpoint, async (request, response) => {
	await yoga(request, response);
});

app.use(express.json({ limit: "1mb" }));

// Här bestäms adresserna. Mapparna i routes/ styr inte adresserna.
app.use("/api/health", healthRouter);
app.use("/api/cms", cmsRouter);
app.use("/api/auth/login", loginRouter);
app.use("/api/auth/signup", signupRouter);
app.use("/api/guides", guidesRouter);
app.use("/api/notices", noticesRouter);
app.use("/api/tours", toursRouter);
app.use("/api/photos", photosRouter);
app.use("/uploads", express.static(config.uploadDir));

app.use(errorHandler);
