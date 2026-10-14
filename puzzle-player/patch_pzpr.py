#!/usr/bin/env python3
"""Patch the vendored pzpr.js.

pzpr.js ships a legacy cleanup that runs on window load and *unregisters every
service worker* (then reloads if any existed). That silently kills this app's
PWA/offline support. We neutralise just that call so pzpr's own load callbacks
still fire, but our service worker is left alone.

Idempotent: safe to run more than once.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, "vendor/pzprjs/dist/js/pzpr.js")

NEEDLE = (
    "navigator.serviceWorker.getRegistrations().then(function(e){"
    "e.forEach(function(e){e.unregister()}),"
    "0<e.length&&location&&setTimeout(function(){location.reload()},500)})"
)
REPLACEMENT = "0 /* serviceWorker cleanup disabled for PWA support */"


def main():
    with open(TARGET, "r", encoding="utf-8") as f:
        src = f.read()

    if REPLACEMENT in src:
        print("already patched")
        return
    if NEEDLE not in src:
        raise SystemExit("patch target not found - pzpr.js may have changed")

    src = src.replace(NEEDLE, REPLACEMENT)
    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(src)
    print("patched", TARGET)


if __name__ == "__main__":
    main()
