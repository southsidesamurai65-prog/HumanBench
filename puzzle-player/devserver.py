#!/usr/bin/env python3
"""Static file server with caching disabled (for local development).

Plain `python -m http.server` lets browsers heuristically cache JS/CSS/HTML,
so code changes can appear not to take effect. This server sends no-store so
every load is fresh.

Usage: python3 devserver.py [port] [bind]
"""
import functools
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):  # keep the console quiet
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    bind = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    here = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(Handler, directory=here)
    with http.server.ThreadingHTTPServer((bind, port), handler) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    main()
