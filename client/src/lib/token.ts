// Token ligger i en variabel i minnet, inte i localStorage.
// Allt JavaScript på sidan kan läsa localStorage, men variabeln nås bara härifrån.
// Priset är att en omladdning tömmer minnet och loggar ut användaren.
let accessToken: string | null = null;

export const getToken = () => accessToken;
export const setToken = (token: string | null) => {
	accessToken = token;
};
