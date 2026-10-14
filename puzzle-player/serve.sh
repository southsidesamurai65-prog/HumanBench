#!/usr/bin/env bash
# Serve the puzzle player locally.
#
#   ./serve.sh            # -> http://127.0.0.1:8000
#   ./serve.sh 9000       # custom port
#
# NOTE: use http://127.0.0.1 or http://localhost in the browser — never
# http://0.0.0.0 (a listen address, and not proxy-bypassed by default).
set -e
cd "$(dirname "$0")"

PORT=8000
[[ "${1:-}" =~ ^[0-9]+$ ]] && PORT="$1"
URL="http://127.0.0.1:${PORT}"

# Open a browser that bypasses any system/proxy setting for loopback.
open_browser() {
  local bypass='localhost;127.0.0.1;[::1];<local>'
  for b in google-chrome google-chrome-stable chromium chromium-browser brave-browser microsoft-edge msedge; do
    if command -v "$b" >/dev/null 2>&1; then
      "$b" --proxy-bypass-list="$bypass" "$1" >/dev/null 2>&1 &
      return 0
    fi
  done
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1 & return 0; fi
  if command -v open >/dev/null 2>&1; then open "$1" >/dev/null 2>&1 & return 0; fi
  return 1
}

echo "Pencil Puzzle Player  ->  ${URL}"
echo "Ctrl+C to stop."

( sleep 1; open_browser "$URL" ) 2>/dev/null || true

exec python3 -m http.server "$PORT" --bind 127.0.0.1
