const isNode = typeof window === 'undefined';

const createMemoryStorage = () => {
	const values = new Map();
	return {
		getItem: (key) => values.has(String(key)) ? values.get(String(key)) : null,
		setItem: (key, value) => values.set(String(key), String(value)),
		removeItem: (key) => values.delete(String(key)),
		clear: () => values.clear(),
	};
};

const windowObj = isNode ? { localStorage: createMemoryStorage() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export const resolveAppId = ({
	testAppId,
	viteAppId,
	legacyAppId,
	queryAppId,
	storedAppId,
} = {}) => {
	const envAppId = testAppId || viteAppId || legacyAppId;
	if (envAppId) return envAppId;
	if (queryAppId) return queryAppId;
	if (storedAppId) return storedAppId;
	return null;
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue !== undefined) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	// __TEST_APP_ID__ may be injected by Playwright addInitScript to prevent
	// undefined from propagating into API URLs when no env var is present.
	const testAppId = !isNode ? windowObj.__TEST_APP_ID__ : null;
	const viteAppId = import.meta.env.VITE_BASE44_APP_ID;
	const legacyAppId = import.meta.env.BASE44_APP_ID;
	const envFunctionsVersion = import.meta.env.VITE_BASE44_FUNCTIONS_VERSION || import.meta.env.BASE44_FUNCTIONS_VERSION;
	const queryAppId = !isNode ? new URLSearchParams(window.location.search).get("app_id") : null;
	const storedAppId = !isNode ? storage.getItem('base44_app_id') : null;
	const resolvedAppId = resolveAppId({
		testAppId,
		viteAppId,
		legacyAppId,
		queryAppId,
		storedAppId,
	});

	if (resolvedAppId) {
		storage.setItem('base44_app_id', resolvedAppId);
	}

	// Dev-only diagnostic: missing VITE_BASE44_APP_ID causes requests to use
	// /api/apps/null/... which produces unexpected API responses.
	if (import.meta.env.DEV && !isNode && !resolvedAppId) {
		console.warn(
			'[app-params] VITE_BASE44_APP_ID is not set. ' +
			'API requests will target /api/apps/null/... — ' +
			'set this variable in your .env or Railway environment.'
		);
	}

	return {
		appId: resolvedAppId,
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: !isNode ? window.location.href : null }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: envFunctionsVersion }),
	}
}

export const appParams = {
	...getAppParams()
}
