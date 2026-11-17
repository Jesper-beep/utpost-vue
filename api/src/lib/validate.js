// Kontrollerar indata mot ett Zod-schema (se schemas.js) innan en route körs.
// Giltig indata ersätter originalet, med rätt typer och utan okända fält.
// Ogiltig indata skickas som ZodError till felhanteraren i app.js, som svarar 400.
// Query-strängen hamnar i req.validQuery, för req.query går inte att skriva över i Express 4.
export const validate =
	(schema, source = "body") =>
	(req, _res, next) => {
		const result = schema.safeParse(req[source]);
		if (!result.success) return next(result.error);
		const targetProperty = source === "query" ? "validQuery" : source;
		req[targetProperty] = result.data;
		next();
	};
