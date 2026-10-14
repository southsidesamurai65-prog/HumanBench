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
> a generic "page isn't working / may have moved" error. `serve.sh` now binds to
> `127.0.0.1` and opens the right URL for you.

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
├── data/
│   ├── puzzles.js              # generated: 500 puzzles (metadata + AI stats + `pack`)
│   ├── solutions.js            # generated: move solutions for hint/solve
│   └── site_puzzles.json       # source: https://ppbench.com/data/puzzles.json
├── vendor/pzprjs/              # the puzzle engine (from the ppbench repo)
├── build_data.py               # regenerates data/*.js
├── golden_300.jsonl            # source: ppbench bundled solutions for the 300
├── extra_puzzles.jsonl         # source: 200 extra puzzles (XOR-encoded solutions)
└── ai_stats.json               # source: per-puzzle AI stats
```

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
