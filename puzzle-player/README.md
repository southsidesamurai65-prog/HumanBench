# Pencil Puzzle Player

A local, interactive UI for **[Pencil Puzzle Bench](https://ppbench.com)** puzzles — the
official **300 benchmark puzzles** (the ones 50+ frontier models were evaluated on) plus an
**extra pack of 200** more puzzles of the same 20 types. **500 playable puzzles total.**

Every puzzle is rendered with the *real* [pzpr.js](https://github.com/sabo2/pzprjs) engine
(the one behind [puzz.link](https://puzz.link)), so you get the exact same controls, rule
checking and "one correct solution" behaviour the benchmark uses. Solve them yourself and
compare your time against the AI models.

![screenshot](https://ppbench.com/figures/leaderboard_puzzle_grid_3x3.svg)

## Features

- **500 puzzles / 20 types**: the benchmark 300 (with AI stats) + a 200-puzzle **Extra pack**
  (same types). Browsable and filterable by type, difficulty, size, pack and AI solve-rate;
  searchable.
- **Difficulty**: the official `easy/medium/hard` tier exists only for the benchmark 300.
  Extra-pack puzzles get an **estimated** tier (shown as `~hard`), derived from grid size and
  solution-move count (per-type normalised; ~76% agreement with the official tiers).
- **AI stats** (solve rates + per-model times) exist **only for the benchmark 300** — the
  benchmark never ran the models on the extra puzzles (confirmed: the published
  `runs/runs.jsonl` is exactly 51 models × 300 puzzles). Extra puzzles show "not run".
- **Real puzzle engine** — draw with mouse/keyboard exactly like puzz.link.
- **Check** — validates against the puzzle's rules (the same step-level verification the
  benchmark uses), and tells you the first rule you broke.
- **Hint** — reveals one required move at a time.
- **Solve** — reveals the full solution (flagged as revealed, not counted as a solve).
- **You vs. AI** — per-puzzle model solve times, and how your time would rank.
- **Two AI metrics**: the benchmark ran each puzzle two ways — **direct ask** (one-shot,
  model emits the whole solution) and **agentic** (iterative, the model can check and
  revise). Agentic is the better proxy for a human playing interactively, so it's the
  default highlighted metric; use the *AI metric* filter to switch. Both rates are shown
  in the puzzle-stats panel. (Agentic was only run on a subset of puzzles, so it falls
  back to direct ask when unavailable.)
- **Rule examples** — OK/NG mini-boards illustrating each rule, straight from pzpr.
- **Local progress** — solved set + best times saved in your browser (`localStorage`).
- Timer, undo, zoom, deep links (`#puz=<id>`).
- **Mobile + installable (PWA)** — touch controls, a board-first phone layout with the puzzle
  list as a slide-in drawer, and an installable offline app (web manifest + service worker).
  Works on Android/iOS; see [Android / phone](#android--phone).

## Run it

Needs **Python 3** (for a static file server — the puzzle engine lazy-loads its
variety scripts, so it must be served over HTTP, not `file://`).

```bash
./serve.sh            # defaults to port 8000
# or
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

> **Use `localhost` or `127.0.0.1` — not `0.0.0.0`.** If you have a system/browser
> proxy enabled, the proxy bypass list normally includes `localhost`/`127.0.0.1` but
> **not** `0.0.0.0`, so `http://0.0.0.0:8000/` gets routed to the proxy and fails with
> a generic "page isn't working / may have moved" error. `serve.sh` binds to
> `127.0.0.1` and opens the right URL for you.

## Android / phone

### 1. Play right now over Wi-Fi (no install)

```bash
./serve.sh --lan
```

It prints a URL like `http://192.168.x.y:8000` — open that on your phone (same Wi-Fi).
The touch UI works. (Allow the port through your firewall if it won't connect.)

### 2. Install it as an app (PWA)

A service worker (offline support + the install prompt) requires a **secure context**:
`https://` or `localhost`. Serving raw `http://192.168…` from your PC is **not** secure,
so it's playable but not installable. To actually *install* it:

- **Host the folder over HTTPS** (GitHub Pages, Netlify, Cloudflare Pages, any static
  host — it's all static, no server code). Then on Android Chrome: **⋮ → Add to Home
  screen / Install app**. It gets an icon, runs fullscreen (`standalone`) and works
  offline after the first load.
- Or expose your local server over HTTPS with a tunnel, e.g. `cloudflared tunnel --url
  http://localhost:8000` (or ngrok), and open the HTTPS URL on the phone.

### 3. A real APK (optional)

The app is plain static web, so you can wrap it with [Capacitor](https://capacitorjs.com):

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android
npx cap init "Pencil Puzzle" com.example.pencilpuzzle --web-dir=.
npx cap add android
npx cap sync
npx cap open android      # or: cd android && ./gradlew assembleDebug
```

This needs the Android SDK + JDK installed (not included here). The
[Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity)
route (Bubblewrap) from a hosted HTTPS URL also works and is lighter.

## Controls

| Action | Input |
|---|---|
| Draw / place | left-click or drag |
| Mark / cross / alternate | right-click |
| Enter digits | number keys `1`–`9` |
| Undo | `Ctrl`+`Z` or the Undo button |
| Check | the Check button or `Ctrl`+`Enter` |

(The exact meaning of left/right click differs per puzzle type — see that puzzle's rules,
shown in the right-hand panel.)

## Layout

```
puzzle-player/
├── index.html                  # single-page app shell
├── css/style.css
├── js/app.js                   # all logic (no build step, no dependencies)
├── manifest.webmanifest        # PWA manifest
├── sw.js                       # service worker (offline cache)
├── icons/                      # PWA icons (generated by make_icons.py)
├── data/
│   ├── puzzles.js              # generated: 500 puzzles (metadata + AI stats + `pack`)
│   ├── solutions.js            # generated: move solutions for hint/solve
│   └── site_puzzles.json       # source: https://ppbench.com/data/puzzles.json
├── vendor/pzprjs/              # the puzzle engine (from the ppbench repo, patched)
├── build_data.py               # regenerates data/*.js
├── make_icons.py               # regenerates icons/
├── patch_pzpr.py               # patches pzpr.js (see below)
├── golden_300.jsonl            # source: ppbench bundled solutions for the 300
├── extra_puzzles.jsonl         # source: 200 extra puzzles (XOR-encoded solutions)
└── ai_stats.json               # source: per-puzzle AI stats
```

> **Why `patch_pzpr.py`?** The vendored `pzpr.js` runs a legacy cleanup on load that
> **unregisters every service worker** (and reloads). That silently disables this app's
> offline/PWA support, so `patch_pzpr.py` neutralises just that call. Run it after
> re-downloading `pzpr.js`.

### Refreshing the data

`build_data.py` merges the sources into `data/puzzles.js` + `data/solutions.js`:

1. `data/site_puzzles.json` — the published 300-puzzle list (type/size/URL).
2. `golden_300.jsonl` — bundled puzzle + encrypted solution moves for those 300 (XOR key
   `ppbench`, same as `ppbench/dataset.py`).
3. `extra_puzzles.jsonl` — 200 additional puzzles, same format (from the HuggingFace full
   dataset, HTTP-Range–sliced to only the supported types).
4. `ai_stats.json` — per-puzzle AI solve counts/times scraped from the play pages.

```bash
python3 build_data.py
```

## Credits

- Puzzles & benchmark: **Pencil Puzzle Bench** by
  [Approximate Labs](https://approximatelabs.com) — MIT.
- Puzzle engine: **pzpr.js** by sabo2 / the puzz.link project — MIT (`vendor/pzprjs/LICENSE.txt`).
- Puzzle data source: [puzz.link](https://puzz.link) / pzv.jp.
