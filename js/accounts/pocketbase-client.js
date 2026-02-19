// js/accounts/pocketbase-client.js
// Singleton PocketBase client instance.
// This module is intentionally minimal to avoid circular dependencies between auth.js and pocketbase.js.

import PocketBase from 'pocketbase';

const DEFAULT_POCKETBASE_URL = 'https://monodb.samidy.com';

/**
 * Resolve the PocketBase URL from environment injection, localStorage override, or the default.
 * Priority: server-injected window.__POCKETBASE_URL__ > localStorage > DEFAULT_POCKETBASE_URL
 * @returns {string}
 */
function resolvePocketBaseUrl() {
    if (window.__POCKETBASE_URL__) return window.__POCKETBASE_URL__;

    const stored = localStorage.getItem('monochrome-pocketbase-url');
    if (stored) return stored;

    return DEFAULT_POCKETBASE_URL;
}

const POCKETBASE_URL = resolvePocketBaseUrl();
console.log('[PocketBase] Using URL:', POCKETBASE_URL);

/** @type {PocketBase} */
const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

export { pb, POCKETBASE_URL, DEFAULT_POCKETBASE_URL };
