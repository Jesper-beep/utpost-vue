import pg from "pg";

const UNIQUE_VIOLATION_CODE = "23505";
const FOREIGN_KEY_VIOLATION_CODE = "23503";

// Drizzle lägger databasfelet från pg i `cause`.
const findDatabaseError = (error: unknown): pg.DatabaseError | null => {
	let databaseError: unknown = error;
	if (error instanceof Error && error.cause !== undefined) {
		databaseError = error.cause;
	}

	if (databaseError instanceof pg.DatabaseError) {
		return databaseError;
	} else {
		return null;
	}
};

const getViolatedConstraint = (error: unknown, code: string): string | null => {
	const databaseError = findDatabaseError(error);
	if (databaseError === null) {
		return null;
	}
	if (databaseError.code !== code) {
		return null;
	}
	if (databaseError.constraint === undefined) {
		return null;
	} else {
		return databaseError.constraint;
	}
};

// Ger namnet på den unika kontrollen som bröts, eller null om felet är något annat.
export const getUniqueViolationConstraint = (error: unknown): string | null => {
	return getViolatedConstraint(error, UNIQUE_VIOLATION_CODE);
};

// Ger namnet på främmande nyckeln som bröts, eller null om felet är något annat.
export const getForeignKeyViolationConstraint = (
	error: unknown,
): string | null => {
	return getViolatedConstraint(error, FOREIGN_KEY_VIOLATION_CODE);
};
