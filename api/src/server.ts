import { app } from "./app.ts";
import { config } from "./config/env.ts";
import { prepareDatabase } from "./db/prepare.ts";

await prepareDatabase();

app.listen(config.port, () => {
	console.log(`API lyssnar på http://localhost:${config.port}`);
});
