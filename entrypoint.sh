#!/bin/sh
# entrypoint.sh — Inject runtime env vars into pre-built Vite HTML files.
#
# vite preview does NOT re-run the config/build phase, so environment variables
# set in docker-compose cannot be passed to the browser via Vite's plugin system
# when AUTH_ENABLED=false. This script handles the injection at container startup
# by patching the already-built dist/index.html before the server starts.

set -e

DIST_DIR="/app/dist"

# Resolve the public PocketBase URL.
# Priority: PUBLIC_POCKETBASE_URL > POCKETBASE_URL > default
PB_URL="${PUBLIC_POCKETBASE_URL:-${POCKETBASE_URL:-https://monodb.samidy.com}}"

echo "[entrypoint] PUBLIC_POCKETBASE_URL  = ${PUBLIC_POCKETBASE_URL:-<unset>}"
echo "[entrypoint] POCKETBASE_URL         = ${POCKETBASE_URL:-<unset>}"
echo "[entrypoint] Resolved browser URL   = ${PB_URL}"

# Build the config script to inject before </head>
CONFIG_SCRIPT="<script>window.__POCKETBASE_URL__=$(printf '%s' "\"${PB_URL}\"");window.__URL_BASE_PUBLIC__=$(printf '%s' "\"${URL_BASE_PUBLIC:-}\"");"

if [ "${AUTH_ENABLED:-false}" != "false" ]; then
    CONFIG_SCRIPT="${CONFIG_SCRIPT}window.__AUTH_GATE__=true;"
fi

CONFIG_SCRIPT="${CONFIG_SCRIPT}</script>"

# Patch index.html
if [ -f "${DIST_DIR}/index.html" ]; then
    # Use a temp file to avoid in-place sed portability issues on Alpine
    sed "s|</head>|${CONFIG_SCRIPT}\n</head>|" "${DIST_DIR}/index.html" > "${DIST_DIR}/index.html.tmp"
    mv "${DIST_DIR}/index.html.tmp" "${DIST_DIR}/index.html"
    echo "[entrypoint] Patched dist/index.html"
fi

# Patch login.html if it exists
if [ -f "${DIST_DIR}/login.html" ]; then
    sed "s|</head>|${CONFIG_SCRIPT}\n</head>|" "${DIST_DIR}/login.html" > "${DIST_DIR}/login.html.tmp"
    mv "${DIST_DIR}/login.html.tmp" "${DIST_DIR}/login.html"
    echo "[entrypoint] Patched dist/login.html"
fi

# Hand off to the original CMD
exec "$@"
