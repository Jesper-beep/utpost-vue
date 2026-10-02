interface BigFetchOptions {
	id?: string | number;
	search?: string;
}

interface BigFetchResult<T> {
	data: T;
	loading: boolean;
}

export const bigFetch = async <T = unknown>(
	url: string,
	{ id, search }: BigFetchOptions = {},
): Promise<BigFetchResult<T>> => {
	let response: Response;
	let data = [] as unknown as T;
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

		data = (await response.json()) as T;
	} catch (error) {
		console.error((error as Error).message);
	} finally {
		loading = false;
	}

	return { data, loading };
};
