#!/usr/bin/env bash
# Serve the puzzle player locally.
#
#   ./serve.sh              # this machine only  -> http://localhost:8000
#   ./serve.sh 9000         # custom port
#   ./serve.sh --lan        # also reachable from your phone on the same Wi-Fi
#
# NOTE: use localhost / 127.0.0.1 on this machine (do NOT type http://0.0.0.0).
# If you run a proxy, 0.0.0.0 is usually not in the bypass list and fails.
set -e
cd "$(dirname "$0")"

PORT=8000
LAN=0
for a in "$@"; do
  case "$a" in
    --lan) LAN=1 ;;
    ''|*[!0-9]*) ;;      # ignore anything non-numeric
    *) PORT="$a" ;;
  esac
done

if [ "$LAN" = 1 ]; then BIND=0.0.0.0; else BIND=127.0.0.1; fi
LOCAL_URL="http://localhost:${PORT}"

echo "Pencil Puzzle Player"
echo "  this machine:  ${LOCAL_URL}"
if [ "$LAN" = 1 ]; then
  echo "  on your phone (same Wi-Fi):"
  if command -v hostname >/dev/null 2>&1; then
    for ip in $(hostname -I 2>/dev/null); do
      case "$ip" in
        *:*) ;;                       # skip IPv6
        *) echo "      http://${ip}:${PORT}" ;;
      esac
    done
  fi
  echo "  (If the phone can't connect, allow the port through your firewall.)"
fi
echo
echo "  Ctrl+C to stop. Serving ${BIND}:${PORT}"

# Best-effort: open a browser on this machine.
if [ "$LAN" = 1 ]; then
  ( sleep 1; xdg-open "$LOCAL_URL" >/dev/null 2>&1 || open "$LOCAL_URL" >/dev/null 2>&1 || true ) &
fi

exec python3 -m http.server "$PORT" --bind "$BIND"
