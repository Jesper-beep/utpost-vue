export const AUTHENTICATION_MESSAGES = {
	conflict: {
		displayName: "Det användarnamnet är upptaget.",
		email: {
			after: " på det befintliga kontot.",
			before: "Den här e-postadressen används redan. Välj en annan eller ",
			linkText: "logga in",
		},
	},
	displayName: {
		invalid: "Använd bara bokstäverna a till z (utan å, ä och ö) och siffror.",
		required: "Välj ett användarnamn.",
		tooLong: (maxLength: number): string =>
			`Användarnamnet får som längst vara ${maxLength} tecken.`,
	},
	email: {
		invalid: "Ange en giltig e-postadress.",
	},
	firstName: {
		invalid:
			"Förnamnet får bara innehålla bokstäver, mellanslag, bindestreck och apostrof.",
		required: "Ange förnamn.",
		tooLong: (maxLength: number): string =>
			`Förnamnet får som längst vara ${maxLength} tecken.`,
	},
	form: {
		failed: "Något gick fel. Försök igen senare.",
		invalidCredentials: "Fel e-postadress eller lösenord.",
		tooManyAttempts: "Lugn i båten! Vänta lite och testa igen om en stund.",
	},
	lastName: {
		invalid:
			"Efternamnet får bara innehålla bokstäver, mellanslag, bindestreck och apostrof.",
		required: "Ange efternamn.",
		tooLong: (maxLength: number): string =>
			`Efternamnet får som längst vara ${maxLength} tecken.`,
	},
	password: {
		invalid: "Lösenordet innehåller ogiltiga tecken.",
		required: "Ange ditt lösenord.",
		tooLong: (maxLength: number): string =>
			`Lösenordet är för långt, ange max ${maxLength} tecken.`,
		tooShort: (minLength: number): string =>
			`Lösenordet är för kort, ange minst ${minLength} tecken.`,
	},
};
