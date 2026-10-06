/** @typedef {{ error: (...arguments_: unknown[]) => void }} ErrorLogger */

/** @param {Error} error @param {ErrorLogger} [logger] */
export const handleUnhandledRejection = (error, logger = console) => {
	logger.error("Ohanterat fel:", error.message);
};
