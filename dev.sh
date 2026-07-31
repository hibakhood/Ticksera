#!/bin/bash
# Fixora dev server - uses the local Node 22 toolchain directly (no PATH needed).
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -x "$HOME/.local/node22/bin/node" ]; then
  NODE="$HOME/.local/node22/bin/node"
else
  NODE="$(command -v node || true)"
fi

if [ -z "$NODE" ]; then
  echo "Error: Node.js not found. Install Node 20.19+ or 22.12+ and try again." >&2
  exit 1
fi

echo "Using Node $("$NODE" --version) ($NODE)"

pkill -f "node_modules/vite/bin/vite.js" 2>/dev/null || true

# Wait for port 5000 to free up if a stale dev server was still shutting down.
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if ! lsof -nP -iTCP:5000 -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

cd "$DIR"
exec "$NODE" node_modules/vite/bin/vite.js
