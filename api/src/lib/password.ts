import {
	argon2 as argon2WithCallback,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const argon2 = promisify(argon2WithCallback);
const HASH_SCHEME = "argon2id";
const KEY_LENGTH = 32;
const SALT_BYTES = 16;

// Värdena motsvarar OWASP:s rekommenderade miniminivå för Argon2id, vilket är "19 MiB minne, två varv och en  parallell tråd".
const ARGON2_PARAMETERS = {
	memory: 19 * 1024, // Anges i KiB (19 MiB)
	parallelism: 1,
	passes: 2,
};

interface HashParts {
	keyHex: string;
	salt: string;
}

const deriveKey = (password: string, salt: string): Promise<Buffer> => {
	return argon2("argon2id", {
		...ARGON2_PARAMETERS,
		message: password,
		nonce: Buffer.from(salt, "hex"),
		tagLength: KEY_LENGTH,
	});
};

// Lösenordet lagras som "argon2id:<salt>:<nyckel>" i kolumnen password_hash.
// Saltet ger olika värden för användare som har samma lösenord.
export const hashPassword = async (password: string): Promise<string> => {
	const salt = randomBytes(SALT_BYTES).toString("hex");
	const key = await deriveKey(password, salt);
	return `${HASH_SCHEME}:${salt}:${key.toString("hex")}`;
};

const splitHash = (storedHash: string | null | undefined): HashParts | null => {
	if (storedHash === null || storedHash === undefined) {
		return null;
	}
	const [scheme, salt, keyHex] = storedHash.split(":");
	if (scheme === HASH_SCHEME && salt && keyHex) {
		return { keyHex, salt };
	} else {
		return null;
	}
};

const createDummyHash = async (): Promise<HashParts> => {
	const parts = splitHash(await hashPassword("no-such-user"));
	if (parts === null) {
		throw new Error("Kunde inte skapa hashvärdet för inloggning utan konto");
	} else {
		return parts;
	}
};

// Räknas mot när användaren saknas eller det lagrade värdet har okänt format.
// Då tar inloggningen lika lång tid som vid fel lösenord.
const DUMMY_HASH = await createDummyHash();

// timingSafeEqual tar lika lång tid oavsett var skillnaden finns
const isSameKey = (derivedKey: Buffer, expectedKey: Buffer): boolean => {
	if (derivedKey.length === expectedKey.length) {
		return timingSafeEqual(derivedKey, expectedKey);
	} else {
		return false;
	}
};

export const verifyPassword = async (
	password: string,
	storedHash: string | null | undefined,
): Promise<boolean> => {
	const knownHash = splitHash(storedHash);
	let hashToCompare: HashParts;
	if (knownHash === null) {
		hashToCompare = DUMMY_HASH;
	} else {
		hashToCompare = knownHash;
	}

	const derivedKey = await deriveKey(password, hashToCompare.salt);
	const expectedKey = Buffer.from(hashToCompare.keyHex, "hex");
	const keysMatch = isSameKey(derivedKey, expectedKey);

	if (knownHash === null) {
		return false;
	} else {
		return keysMatch;
	}
};
