import {
	randomBytes,
	scrypt as scryptWithCallback,
	timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptWithCallback);
const HASH_SCHEME = "scrypt";
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

// Värdena följer OWASP:s rekommendation för scrypt: N = 2^17, r = 8, p = 1.
// Nodes standard är N = 2^14, vilket är åtta gånger lättare att gissa mot.
// maxmem måste rymma 128 * N * r byte.
const SCRYPT_PARAMS = { maxmem: 256 * 1024 * 1024, N: 2 ** 17, p: 1, r: 8 };

const deriveKey = (password, salt) =>
	scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS);

// Lösenordet lagras som "scrypt:<salt>:<nyckel>" i kolumnen password_hash.
// Saltet ger olika värden för användare som har samma lösenord.
export const hashPassword = async (password) => {
	const salt = randomBytes(SALT_BYTES).toString("hex");
	const key = await deriveKey(password, salt);
	return `${HASH_SCHEME}:${salt}:${key.toString("hex")}`;
};

// Räknas mot när användaren saknas eller det lagrade värdet har okänt format.
// Då tar inloggningen lika lång tid som vid fel lösenord.
const DUMMY_HASH = await hashPassword("no-such-user");

export const verifyPassword = async (password, storedHash) => {
	const [scheme, salt, storedKeyHex] = String(storedHash ?? "").split(":");
	const isKnownFormat =
		scheme === HASH_SCHEME && Boolean(salt) && Boolean(storedKeyHex);
	const [, saltToCompare, keyHexToCompare] = (
		isKnownFormat ? storedHash : DUMMY_HASH
	).split(":");
	const derivedKey = await deriveKey(password, saltToCompare);
	const expectedKey = Buffer.from(keyHexToCompare, "hex");
	// timingSafeEqual tar lika lång tid oavsett var skillnaden finns
	const isSameKey =
		derivedKey.length === expectedKey.length &&
		timingSafeEqual(derivedKey, expectedKey);
	return isKnownFormat && isSameKey;
};
