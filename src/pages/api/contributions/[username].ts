import type { APIRoute } from 'astro';

export const prerender = false;

const REQUEST_TIMEOUT_MS = 8000;
const SUCCESS_TTL_MS = 5 * 60 * 1000;
const ERROR_TTL_MS = 30 * 1000;
const NOT_FOUND_TTL_MS = 60 * 1000;
const SUCCESS_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';
const ERROR_CACHE_CONTROL = 'public, max-age=30';
const NO_STORE_CACHE_CONTROL = 'no-store';

type CachedResponse = {
	body: unknown;
	status: number;
	cacheControl: string;
	expiresAt: number;
};

const cache = new Map<string, CachedResponse>();
const inFlightRequests = new Map<string, Promise<CachedResponse>>();

export const GET: APIRoute = async ({ params }) => {
	const username = params.username?.trim();

	if (!username || !isValidGitHubUsername(username)) {
		return jsonResponse(
			{ error: 'Invalid GitHub username' },
			400,
			NO_STORE_CACHE_CONTROL
		);
	}

	const cacheKey = username.toLowerCase();
	const cached = cache.get(cacheKey);

	if (cached && cached.expiresAt > Date.now()) {
		return jsonResponse(cached.body, cached.status, cached.cacheControl);
	}

	if (cached) {
		cache.delete(cacheKey);
	}

	const pendingRequest = inFlightRequests.get(cacheKey);
	const response = pendingRequest ?? fetchContributionData(username);

	if (!pendingRequest) {
		inFlightRequests.set(cacheKey, response);
	}

	try {
		const result = await response;
		cache.set(cacheKey, result);

		return jsonResponse(result.body, result.status, result.cacheControl);
	} finally {
		inFlightRequests.delete(cacheKey);
	}
};

function isValidGitHubUsername(username: string) {
	return (
		username.length <= 39 &&
		/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username) &&
		!username.includes('--')
	);
}

async function fetchContributionData(username: string): Promise<CachedResponse> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(`https://github.com/${username}.contribs`, {
			signal: controller.signal,
			headers: { Accept: 'application/json' },
		});

		if (response.status === 404) {
			return cacheableResponse(
				{ error: 'GitHub user not found' },
				404,
				ERROR_CACHE_CONTROL,
				NOT_FOUND_TTL_MS
			);
		}

		if (!response.ok) {
			return cacheableResponse(
				{ error: 'Failed to fetch contribution data' },
				502,
				ERROR_CACHE_CONTROL,
				ERROR_TTL_MS
			);
		}

		try {
			const body = await response.json();

			return cacheableResponse(body, 200, SUCCESS_CACHE_CONTROL, SUCCESS_TTL_MS);
		} catch {
			return cacheableResponse(
				{ error: 'Invalid response from GitHub' },
				502,
				ERROR_CACHE_CONTROL,
				ERROR_TTL_MS
			);
		}
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			return cacheableResponse(
				{ error: 'GitHub contribution request timed out' },
				504,
				ERROR_CACHE_CONTROL,
				ERROR_TTL_MS
			);
		}

		return cacheableResponse(
			{ error: 'Failed to fetch contribution data' },
			502,
			ERROR_CACHE_CONTROL,
			ERROR_TTL_MS
		);
	} finally {
		clearTimeout(timeout);
	}
}

function cacheableResponse(
	body: unknown,
	status: number,
	cacheControl: string,
	ttlMs: number
): CachedResponse {
	return {
		body,
		status,
		cacheControl,
		expiresAt: Date.now() + ttlMs,
	};
}

function jsonResponse(body: unknown, status: number, cacheControl: string) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': cacheControl,
		},
	});
}
