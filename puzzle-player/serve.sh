#!/usr/bin/env bash
# Serve the puzzle player locally.
#   ./serve.sh          # http://localhost:8000
#   ./serve.sh 9000     # custom port
set -e
cd "$(dirname "$0")"
PORT="${1:-8000}"
URL="http://localhost:${PORT}"

cat <<EOF
Pencil Puzzle Player
  open:  ${URL}
  (or)   http://127.0.0.1:${PORT}

  Use localhost / 127.0.0.1 — do NOT use http://0.0.0.0:${PORT}.
  If you run a system/browser proxy, 0.0.0.0 is usually NOT in the proxy
  bypass list, so that URL gets sent to the proxy and fails to load.
  localhost and 127.0.0.1 are bypassed by default.

  Ctrl+C to stop.
EOF

# Best-effort: open a browser shortly after the server starts.
( sleep 1; xdg-open "$URL" >/dev/null 2>&1 || open "$URL" >/dev/null 2>&1 || true ) &

exec python3 -m http.server "$PORT" --bind 127.0.0.1
