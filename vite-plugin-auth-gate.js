// vite-plugin-auth-gate.js
// Authentication gate Vite plugin.
// Firebase has been fully removed — token verification is now done via PocketBase API.
// Flow: client authenticates with PocketBase → sends pb.authStore.token (JWT) to /api/auth/login
//       → server validates token via PocketBase /api/collections/users/auth-refresh → creates session cookie

import { loadEnv } from 'vite';
import cookieSession from 'cookie-session';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

/**
 * Parse the raw request body as JSON.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Validate a PocketBase JWT token by calling the PocketBase API.
 * PocketBase does not expose a public JWKS endpoint; the most reliable way to validate a token
 * server-side is to call /api/collections/users/auth-refresh with the token as Bearer.
 *
 * @param {string} pocketbaseUrl - e.g. https://monodb.samidy.com
 * @param {string} token - pb.authStore.token from the client
 * @returns {Promise<{ id: string; email: string } | null>} Null on invalid token
 */
async function verifyPocketBaseToken(pocketbaseUrl, token) {
    const url = `${pocketbaseUrl}/api/collections/users/auth-refresh`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    const record = data.record;
    if (!record || !record.id) return null;

    return { id: record.id, email: record.email || '' };
}

export default function authGatePlugin() {
    let env = {};

    return {
        name: 'auth-gate',

        config(_, { mode }) {
            env = loadEnv(mode, process.cwd(), '');
        },

        configurePreviewServer(server) {
            const AUTH_ENABLED = (env.AUTH_ENABLED ?? 'false') !== 'false';
            const POCKETBASE_URL = env.POCKETBASE_URL || 'https://monodb.samidy.com';

            // --- Build injection script (always active for env config) ---

            const flags = [];
            if (AUTH_ENABLED) flags.push('window.__AUTH_GATE__=true');
            if (POCKETBASE_URL) flags.push(`window.__POCKETBASE_URL__=${JSON.stringify(POCKETBASE_URL)}`);
            const configScript = flags.length > 0 ? `<script>${flags.join(';')};</script>` : null;

            // --- Pre-cache injected HTML at startup ---

            const distDir = join(process.cwd(), 'dist');

            let indexHtml = null;
            const indexPath = join(distDir, 'index.html');
            if (configScript && existsSync(indexPath)) {
                indexHtml = readFileSync(indexPath, 'utf-8');
                indexHtml = indexHtml.replace('</head>', `${configScript}\n</head>`);
            }

            let loginHtml = null;
            if (AUTH_ENABLED) {
                const loginPath = join(distDir, 'login.html');
                if (existsSync(loginPath)) {
                    loginHtml = readFileSync(loginPath, 'utf-8');
                    if (configScript) loginHtml = loginHtml.replace('</head>', `${configScript}\n</head>`);
                }
            }

            // --- /health (always available, no auth required) ---

            server.middlewares.use((req, res, next) => {
                if (req.url.split('?')[0] === '/health') {
                    res.end('OK');
                    return;
                }
                next();
            });

            // --- Auth gate (only when AUTH_ENABLED=true) ---

            if (AUTH_ENABLED) {
                const AUTH_SECRET = env.AUTH_SECRET;
                const SESSION_MAX_AGE = Number(env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000;

                if (!AUTH_SECRET) {
                    console.error('[auth-gate] AUTH_SECRET is required when AUTH_ENABLED=true');
                    process.exit(1);
                }

                console.log(`[auth-gate] Auth gate enabled (PocketBase: ${POCKETBASE_URL})`);

                server.middlewares.use(
                    cookieSession({
                        name: 'mono_session',
                        keys: [AUTH_SECRET],
                        maxAge: SESSION_MAX_AGE,
                        httpOnly: true,
                        sameSite: 'lax',
                    })
                );

                server.middlewares.use(async (req, res, next) => {
                    const url = req.url.split('?')[0];

                    // --- /login → serve login page (redirect to / if already authenticated) ---
                    if (url === '/login' || url === '/login.html') {
                        if (req.session && req.session.uid) {
                            res.writeHead(302, { Location: '/' });
                            res.end();
                            return;
                        }
                        if (loginHtml) {
                            res.setHeader('Content-Type', 'text/html');
                            res.setHeader('Cache-Control', 'no-store');
                            res.end(loginHtml);
                        } else {
                            res.statusCode = 404;
                            res.end('Login page not found');
                        }
                        return;
                    }

                    // --- POST /api/auth/login → validate PocketBase token → create session ---
                    if (url === '/api/auth/login' && req.method === 'POST') {
                        try {
                            const body = await parseBody(req);
                            if (!body.token || typeof body.token !== 'string') {
                                res.statusCode = 400;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: 'Missing or invalid token' }));
                                return;
                            }

                            const userInfo = await verifyPocketBaseToken(POCKETBASE_URL, body.token);

                            if (!userInfo) {
                                res.statusCode = 401;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: 'Invalid or expired PocketBase token' }));
                                return;
                            }

                            req.session.uid = userInfo.id;
                            req.session.email = userInfo.email;
                            req.session.iat = Date.now();

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ ok: true }));
                        } catch (err) {
                            console.error('[auth-gate] Token verification failed:', err.message);
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'Server error during authentication' }));
                        }
                        return;
                    }

                    // --- POST /api/auth/logout → clear session ---
                    if (url === '/api/auth/logout' && req.method === 'POST') {
                        req.session = null;
                        res.setHeader('Clear-Site-Data', '"cache", "storage"');
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ ok: true }));
                        return;
                    }

                    // --- Unauthenticated request: reject or redirect ---
                    if (!req.session || !req.session.uid) {
                        const ext = extname(url);
                        if (ext && ext !== '.html') {
                            res.statusCode = 401;
                            res.end('Unauthorized');
                        } else {
                            res.writeHead(302, { Location: '/login' });
                            res.end();
                        }
                        return;
                    }

                    // --- Authenticated: serve injected index.html for HTML routes ---
                    const ext = extname(url);
                    if ((!ext || ext === '.html') && indexHtml) {
                        res.setHeader('Content-Type', 'text/html');
                        res.setHeader('Cache-Control', 'no-store');
                        res.end(indexHtml);
                        return;
                    }

                    next();
                });
            } else if (indexHtml) {
                // No auth gate, but env config still needs injection into served HTML
                server.middlewares.use((req, res, next) => {
                    const url = req.url.split('?')[0];
                    const ext = extname(url);
                    if (!ext || ext === '.html') {
                        res.setHeader('Content-Type', 'text/html');
                        res.end(indexHtml);
                        return;
                    }
                    next();
                });
            }
        },
    };
}
