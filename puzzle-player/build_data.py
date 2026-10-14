#!/usr/bin/env python3
"""Build data/puzzles.js and data/solutions.js.

Inputs (in this folder unless overridden):
    data/site_puzzles.json  - https://ppbench.com/data/puzzles.json  (the 300 benchmark puzzles)
    golden_300.jsonl        - ppbench bundled solutions for those 300 (XOR key "ppbench")
    ai_stats.json           - per-puzzle AI results scraped from play pages (optional)
    extra_puzzles.jsonl     - additional puzzles (same XOR-encoded solutions), optional

Outputs:
    data/puzzles.js    -> window.PUZZLES   (metadata + AI stats; field `pack` = "bench"|"extra")
    data/solutions.js  -> window.SOLUTIONS (mouse/key move solutions for hint/solve)
"""
import argparse
import base64
import hashlib
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
XOR_KEY = b"ppbench"


def decrypt_solution(enc):
    raw = base64.b64decode(enc)
    dec = bytes(b ^ XOR_KEY[i % len(XOR_KEY)] for i, b in enumerate(raw))
    return json.loads(dec)


def core(puzzlink_url):
    tail = puzzlink_url.split("p?", 1)[1] if "p?" in puzzlink_url else puzzlink_url
    return tail.split("&")[0]


def canon_id(pid, c):
    h = hashlib.md5(("https://puzz.link/p?" + c).encode()).hexdigest()
    return f"{pid}_{h}"


def add_estimated_tiers(entries, w_area=-1.0, w_moves=2.3):
    """Add `tierEst` (easy|medium|hard) to every entry from intrinsic features."""
    import statistics

    by_type = {}
    for e in entries:
        by_type.setdefault(e["type"], []).append((e["area"], e.get("moves") or 0))
    stats = {}
    for t, vals in by_type.items():
        areas = [a for a, _ in vals]
        moves = [m for _, m in vals]
        stats[t] = (
            statistics.mean(areas), statistics.pstdev(areas) or 1.0,
            statistics.mean(moves), statistics.pstdev(moves) or 1.0,
        )

    for e in entries:
        ma, sa, mm, sm = stats[e["type"]]
        score = w_area * (e["area"] - ma) / sa + w_moves * ((e.get("moves") or 0) - mm) / sm
        e["_est"] = score

    ordered = sorted(e["_est"] for e in entries)
    n = len(ordered)
    lo, hi = ordered[n // 3], ordered[(2 * n) // 3]
    for e in entries:
        s = e.pop("_est")
        e["tierEst"] = "easy" if s <= lo else ("medium" if s <= hi else "hard")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ai", default=os.path.join(HERE, "ai_stats.json"))
    ap.add_argument("--golden", default=os.path.join(HERE, "golden_300.jsonl"))
    ap.add_argument("--extra", default=os.path.join(HERE, "extra_puzzles.jsonl"))
    ap.add_argument("--puzzles", default=os.path.join(HERE, "data", "site_puzzles.json"))
    ap.add_argument("--outdir", default=os.path.join(HERE, "data"))
    args = ap.parse_args()

    puzzles = json.load(open(args.puzzles))

    ai = {}
    if os.path.exists(args.ai):
        ai = json.load(open(args.ai))
        print(f"loaded AI stats for {len(ai)} puzzles")

    sol_by_core = {}
    if os.path.exists(args.golden):
        with open(args.golden) as f:
            for line in f:
                if not line.strip():
                    continue
                o = json.loads(line)
                if "solution_enc" not in o:
                    continue
                s = decrypt_solution(o["solution_enc"])
                sol_by_core[core(o["puzzlink_url"])] = {
                    "full": s.get("moves_full", []),
                    "required": s.get("moves_required", []),
                }
        print(f"loaded golden solutions for {len(sol_by_core)} puzzles")

    out = []
    solutions = {}
    seen_ids = set()

    # --- the 300 benchmark puzzles (with AI stats) ---
    for p in puzzles:
        c = p["pzpr_url"].split("&")[0]
        entry = {
            "id": p["id"],
            "type": p["type"],
            "width": p["width"],
            "height": p["height"],
            "area": p["area"],
            "moves": p.get("moves"),
            "tier": p.get("difficulty_tier"),
            "pzpr_url": p["pzpr_url"],
            "pack": "bench",
        }
        a = ai.get(p["id"])
        if a:
            entry["ai"] = {
                "idx": a.get("idx"),
                "solved": a.get("solved_count"),
                "total": a.get("total_count"),
                "failed": a.get("failed_count"),
                "split": a.get("solve_split"),
                "times": a.get("ai_times") or [],
            }
        sol = sol_by_core.get(c)
        if sol:
            entry["hintCount"] = len(sol["required"])
            solutions[p["id"]] = {"full": sol["full"], "required": sol["required"]}
        seen_ids.add(p["id"])
        out.append(entry)

    # --- extra puzzles (no AI stats) ---
    n_extra = 0
    if args.extra and os.path.exists(args.extra):
        with open(args.extra) as f:
            for line in f:
                if not line.strip():
                    continue
                o = json.loads(line)
                c = core(o["puzzlink_url"])
                pid = o["pid"]
                eid = canon_id(pid, c)
                if eid in seen_ids:
                    continue
                seen_ids.add(eid)
                entry = {
                    "id": eid,
                    "type": pid,
                    "width": o["width"],
                    "height": o["height"],
                    "area": o["area"],
                    "moves": o.get("number_required_moves"),
                    "tier": None,
                    "pzpr_url": c,
                    "pack": "extra",
                }
                if o.get("solution_enc"):
                    s = decrypt_solution(o["solution_enc"])
                    entry["hintCount"] = len(s.get("moves_required", []))
                    solutions[eid] = {
                        "full": s.get("moves_full", []),
                        "required": s.get("moves_required", []),
                    }
                out.append(entry)
                n_extra += 1
        print(f"loaded {n_extra} extra puzzles")

    os.makedirs(args.outdir, exist_ok=True)

    # --- estimated difficulty -------------------------------------------------
    # Official tiers are model-performance based and only exist for the 300.
    # For puzzles without one (the extra pack) estimate from intrinsic features:
    # within each type, z-score(area) and z-score(required moves), then
    #   score = -1.0*z_area + 2.3*z_moves      (harder = smaller grid, more moves)
    # and cut the whole set into terciles. Weights were fit against the official
    # 300 tiers (~76% agreement; chance is 33%). Marked as "est." in the UI.
    add_estimated_tiers(out)

    with open(os.path.join(args.outdir, "puzzles.js"), "w") as f:
        f.write("// Auto-generated by build_data.py - do not edit by hand.\n")
        f.write("window.PUZZLES = ")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    with open(os.path.join(args.outdir, "solutions.js"), "w") as f:
        f.write("// Auto-generated by build_data.py - do not edit by hand.\n")
        f.write("window.SOLUTIONS = ")
        json.dump(solutions, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"wrote {len(out)} puzzles ({n_extra} extra), {len(solutions)} solution sets")


if __name__ == "__main__":
    main()
