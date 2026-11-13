// Express 4 fångar inte fel från async-routes, så anropet skulle hänga utan svar.
// wrap skickar felet vidare till felhanteraren i app.js.
export const wrap = (handler) => (req, res, next) =>
	Promise.resolve(handler(req, res, next)).catch(next);
