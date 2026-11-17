// Token sparas i en variabel i minnet och inte i localStorage.
// Vilken JavaScript-kod som helst på sidan kan läsa localStorage, men variabeln nås bara härifrån.
// Priset är att en omladdning tömmer minnet, så användaren blir utloggad.
let accessToken: string | null = null;

export const getToken = () => accessToken;
export const setToken = (token: string | null) => {
	accessToken = token;
};
