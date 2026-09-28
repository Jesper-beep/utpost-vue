export const bigFetch = async (url, searchParam) => {
	let response;
	let data = [];
	let loading = false;

	try {
		if (searchParam !== "" && searchParam !== undefined) {
			response = await fetch(
				`${url}/search?q=${encodeURIComponent(searchParam)}`,
			);
		} else {
			response = await fetch(url);
		}

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		data = await response.json();
	} catch (err) {
		console.error(err.message);
	} finally {
		loading = false;
	}

	// console.log(data)
	return { data, loading };
};
