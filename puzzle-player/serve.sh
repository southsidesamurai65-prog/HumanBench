#!/usr/bin/env bash
# Serve the puzzle player locally.
#
#   ./serve.sh                 # this computer only  -> http://127.0.0.1:8000
#   ./serve.sh 9000            # custom port
#   ./serve.sh --lan           # also reachable from your phone on the same Wi-Fi
#   ./serve.sh --lan --no-open # don't launch a browser
#
# IMPORTANT: never type http://0.0.0.0 in the browser.
#   0.0.0.0 means "listen on every interface"; it is not a normal destination and
#   is NOT covered by the browser's automatic loopback proxy bypass, so a proxy
#   will grab it and the page fails. Use 127.0.0.1 / localhost on this machine,
#   and the LAN IP on your phone.
set -e
cd "$(dirname "$0")"

PORT=8000
LAN=0
OPEN=1
for a in "$@"; do
  case "$a" in
    --lan) LAN=1 ;;
    --no-open) OPEN=0 ;;
    ''|*[!0-9]*) ;;        # ignore anything non-numeric
    *) PORT="$a" ;;
  esac
done

if [ "$LAN" = 1 ]; then BIND=0.0.0.0; else BIND=127.0.0.1; fi
LOCAL_URL="http://127.0.0.1:${PORT}"

# Primary LAN IPv4 (the one packets actually leave through), avoid docker bridges.
PRIMARY_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
[ -z "$PRIMARY_IP" ] && PRIMARY_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

# Open a browser with a proxy bypass for local hosts (fixes proxies that grab
# 127.0.0.1/0.0.0.0). Falls back to the system opener.
open_browser() {
  local url="$1"
  local bypass='localhost;127.0.0.1;0.0.0.0;[::1];<local>'
  for b in google-chrome google-chrome-stable chromium chromium-browser brave-browser microsoft-edge msedge; do
    if command -v "$b" >/dev/null 2>&1; then
      "$b" --proxy-bypass-list="$bypass" "$url" >/dev/null 2>&1 &
      return 0
    fi
  done
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$url" >/dev/null 2>&1 & return 0; fi
  if command -v open >/dev/null 2>&1; then open "$url" >/dev/null 2>&1 & return 0; fi
  return 1
}

echo "Pencil Puzzle Player"
echo "  this computer:   ${LOCAL_URL}   (or http://localhost:${PORT})"
if [ "$LAN" = 1 ]; then
  echo "  phone (Wi-Fi):   http://${PRIMARY_IP}:${PORT}"
  echo "  other ifaces:    $(hostname -I 2>/dev/null)"
fi
echo
echo "  Use 127.0.0.1 / localhost — do NOT open http://0.0.0.0 (proxy-blocked)."
if [ "$LAN" = 1 ]; then
  echo "  Listening on port ${PORT} (all interfaces).  Ctrl+C to stop."
else
  echo "  Listening on port ${PORT} (127.0.0.1 only).   Ctrl+C to stop."
fi

if [ "$OPEN" = 1 ]; then
  ( sleep 1; open_browser "$LOCAL_URL" ) 2>/dev/null || true
fi

exec python3 -m http.server "$PORT" --bind "$BIND"
