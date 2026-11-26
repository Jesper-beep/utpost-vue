import { z } from "zod";
import { AUTHENTICATION_MESSAGES } from "../messages/authentication.ts";

export const EMAIL_MAX_LENGTH = 254;
export const EMAIL_LOCAL_PART_MAX_LENGTH = 64;
export const FIRST_NAME_MAX_LENGTH = 50;
export const LAST_NAME_MAX_LENGTH = 50;
export const DISPLAY_NAME_MAX_LENGTH = 15;
export const PASSWORD_MIN_LENGTH = 16;
export const PASSWORD_MAX_LENGTH = 64;

const DISPLAY_NAME_PATTERN = /^[a-z0-9]+$/;
// Bokstäver i alla språk, åtskilda av ett mellanslag, bindestreck eller apostrof. Namnet kan inte börja eller sluta med ett tecken som inte är en bokstav.
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u;
const CONTROL_CHARACTERS_PATTERN = /^[^\p{Cc}]*$/u;

// Längden räknas i tecken (Unicode "codepoints"), så att en emoji räknas som ett tecken.
const countCharacters = (text: string): number => {
	return [...text].length;
};

const getLocalPart = (email: string): string => {
	return email.slice(0, email.lastIndexOf("@"));
};

const emailSchema = z
	.string()
	.trim()
	.toLowerCase()
	.pipe(
		z
			.email({ error: AUTHENTICATION_MESSAGES.email.invalid })
			.max(EMAIL_MAX_LENGTH, { error: AUTHENTICATION_MESSAGES.email.invalid })
			.refine(
				(email) => getLocalPart(email).length <= EMAIL_LOCAL_PART_MAX_LENGTH,
				{ error: AUTHENTICATION_MESSAGES.email.invalid },
			),
	);

// Användarnamnet sparas med små bokstäver, så att det är unikt oavsett hur användaren skriver det.
const displayNameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(1, { error: AUTHENTICATION_MESSAGES.displayName.required })
	.max(DISPLAY_NAME_MAX_LENGTH, {
		error: AUTHENTICATION_MESSAGES.displayName.tooLong(DISPLAY_NAME_MAX_LENGTH),
	})
	.regex(DISPLAY_NAME_PATTERN, {
		error: AUTHENTICATION_MESSAGES.displayName.invalid,
	});

const firstNameSchema = z
	.string()
	.trim()
	.min(1, { error: AUTHENTICATION_MESSAGES.firstName.required })
	.max(FIRST_NAME_MAX_LENGTH, {
		error: AUTHENTICATION_MESSAGES.firstName.tooLong(FIRST_NAME_MAX_LENGTH),
	})
	.regex(NAME_PATTERN, { error: AUTHENTICATION_MESSAGES.firstName.invalid });

const lastNameSchema = z
	.string()
	.trim()
	.min(1, { error: AUTHENTICATION_MESSAGES.lastName.required })
	.max(LAST_NAME_MAX_LENGTH, {
		error: AUTHENTICATION_MESSAGES.lastName.tooLong(LAST_NAME_MAX_LENGTH),
	})
	.regex(NAME_PATTERN, { error: AUTHENTICATION_MESSAGES.lastName.invalid });

// Normaliseringen NFKC ger samma hashvärde för samma synliga lösenord.
const passwordBaseSchema = z.string().normalize("NFKC");

// Vid inloggning kontrolleras endast maxlängden, så att ett äldre och kortare lösenord fortfarande fungerar.
const loginPasswordSchema = passwordBaseSchema
	.min(1, { error: AUTHENTICATION_MESSAGES.password.required })
	.refine((password) => countCharacters(password) <= PASSWORD_MAX_LENGTH, {
		error: AUTHENTICATION_MESSAGES.password.tooLong(PASSWORD_MAX_LENGTH),
	});

const registerPasswordSchema = passwordBaseSchema
	.regex(CONTROL_CHARACTERS_PATTERN, {
		error: AUTHENTICATION_MESSAGES.password.invalid,
	})
	.refine((password) => countCharacters(password) >= PASSWORD_MIN_LENGTH, {
		error: AUTHENTICATION_MESSAGES.password.tooShort(PASSWORD_MIN_LENGTH),
	})
	.refine((password) => countCharacters(password) <= PASSWORD_MAX_LENGTH, {
		error: AUTHENTICATION_MESSAGES.password.tooLong(PASSWORD_MAX_LENGTH),
	});

export const loginSchema = z.object({
	email: emailSchema,
	password: loginPasswordSchema,
});

export const registerSchema = z.object({
	displayName: displayNameSchema,
	email: emailSchema,
	firstName: firstNameSchema,
	lastName: lastNameSchema,
	password: registerPasswordSchema,
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
