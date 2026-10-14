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

> **Use `localhost` or `127.0.0.1` — not `0.0.0.0`.** `0.0.0.0` is a *listen* address
> ("all interfaces"), not a normal destination, and it is **not** covered by the browser's
> automatic loopback proxy bypass — so a system/browser proxy grabs it and the page fails
> with a generic "page isn't working / may have moved" error. `localhost`/`127.0.0.1` *are*
> bypassed by default, so they just work.
>
> A served web page **cannot** change your browser's proxy settings (that's a client-side
> config), so if `0.0.0.0` (or even loopback) is being proxied, do one of:
> - Use `http://127.0.0.1:8000/` — browsers bypass loopback automatically.
> - Add `localhost`, `127.0.0.1`, `0.0.0.0` to your **proxy tool's bypass list** /
>   OS proxy exceptions.
> - Launch the browser with an explicit bypass, e.g. Chromium/Chrome:
>   `google-chrome --proxy-bypass-list="localhost;127.0.0.1;0.0.0.0;<local>" http://127.0.0.1:8000`.
>   `serve.sh` already tries exactly this when it opens the browser.
> - Phone (Wi-Fi) users: use the printed **LAN IP** (e.g. `http://192.168…:8000`), never `0.0.0.0`.

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

### 3. Build the Android app (APK)

A ready-to-open **Capacitor** Android project is included in `android/`. It bundles the
whole web app locally (no internet needed to play).

**Requirements on the build machine:** a recent **Android Studio** (compileSdk 36 → AS
Ladybug/2024.2+) with **JDK 17+**, and the Android SDK. Node is *not* required — the web
assets are already committed under `android/app/src/main/assets/public/`.

**Option A — Android Studio (easiest):**
1. Open the `android/` folder as a project (not the repo root).
2. Let Gradle sync (it downloads the Gradle/AGP versions it needs).
3. **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
   Output: `android/app/build/outputs/apk/debug/app-debug.apk` — copy it to the phone and
   install (enable "install unknown apps").

**Option B — command line** (with `ANDROID_HOME` set):
```bash
cd android && ./gradlew assembleDebug
```

**Option C — full pipeline** (rebuild web + sync + gradle; needs Node + SDK):
```bash
./scripts/build-apk.sh
```

**After changing the web app** (if you have Node):
```bash
npm install         # first time only
npm run sync        # rebuild www/ and copy it into android/
```
The app loads `https://localhost` in a WebView (a secure context), so it behaves exactly
like the browser version, offline, with touch input.

> The generated Android icons and splash screens come from `make_android_icons.py`
> (re-run it if you change `android/` or the design).

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
├── android/                    # Capacitor Android project (open this in Android Studio)
├── scripts/build-web.sh        # assemble www/ (runtime files only)
├── scripts/build-apk.sh        # web + sync + gradle assembleDebug
├── package.json                # Capacitor deps + npm scripts
├── capacitor.config.json       # appId / appName / webDir=www
├── build_data.py               # regenerates data/*.js
├── make_icons.py               # regenerates icons/ (PWA)
├── make_android_icons.py       # regenerates android launcher icons + splash
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
