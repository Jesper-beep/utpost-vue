export const bigFetch = async (url, { id, search } = {}) => {
	let response;
	let data = [];
	let loading = false;

	try {
		if (id !== undefined) {
			response = await fetch(`${url}/${encodeURIComponent(id)}`);
		} else if (search !== "" && search !== undefined) {
			response = await fetch(`${url}/search?q=${encodeURIComponent(search)}`);
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
