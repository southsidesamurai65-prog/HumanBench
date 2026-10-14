/* Pencil Puzzle Player - app logic (no build step). */
(function () {
  "use strict";

  var PUZZLES = window.PUZZLES || [];
  var STORE_KEY = "pp_player_v1";

  // ---------------------------------------------------------------- storage
  function loadStore() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      s.solved = s.solved || {};   // id -> bestSeconds
      s.prefs = s.prefs || {};
      return s;
    } catch (e) {
      return { solved: {}, prefs: {} };
    }
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }
  var store = loadStore();

  // ---------------------------------------------------------------- helpers
  var $ = function (id) { return document.getElementById(id); };
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function titleCase(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function effectiveTier(p) { return p.tier || p.tierEst || null; }
  function tierTag(p) {
    if (p.tier) return '<span class="tag tier-' + p.tier + '">' + p.tier + "</span>";
    if (p.pack === "extra" && p.tierEst) {
      return '<span class="tag tier-est" title="Estimated difficulty (heuristic from grid size + solution moves), not the official benchmark tier">~' + p.tierEst + "</span>";
    }
    return "";
  }
  function escapeHtml(t) {
    var d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
  }

  // AI solve-rate: parse the "12/69 agentic · 2/68 direct ask" split into both
  // strategies. `agentic` is the iterative (tool-using) run; `direct ask` is one-shot.
  function aiSolved(p) { return p.ai && p.ai.solved != null ? p.ai.solved : null; }
  function aiTotal(p) { return p.ai && p.ai.total != null ? p.ai.total : null; }
  function hasAI(p) { return !!(p.ai && p.ai.times && p.ai.times.length); }
  function aiRates(p) {
    var split = (p.ai && p.ai.split) || "";
    function grab(label) {
      var m = new RegExp("(\\d+)\\s*/\\s*(\\d+)\\s*" + label).exec(split);
      return m ? { solved: +m[1], total: +m[2] } : null;
    }
    return { agentic: grab("agentic"), direct: grab("direct") };
  }
  function pct(r) { return r && r.total ? Math.round(100 * r.solved / r.total) : null; }
  // The highlighted metric, falling back to the other strategy when unavailable.
  function aiMetric(p) {
    var r = aiRates(p);
    var first = filters.metric === "direct" ? r.direct : r.agentic;
    var second = filters.metric === "direct" ? r.agentic : r.direct;
    return first || second || null;
  }
  function aiTooltip(p) {
    var r = aiRates(p), parts = [];
    if (r.agentic) parts.push("agentic " + r.agentic.solved + "/" + r.agentic.total + " (" + pct(r.agentic) + "%)");
    if (r.direct) parts.push("direct ask " + r.direct.solved + "/" + r.direct.total + " (" + pct(r.direct) + "%)");
    return parts.join(" · ");
  }

  // ---------------------------------------------------------------- filters
  var filters = {
    search: "", type: "", tier: "", size: "", sort: "default", hideSolved: false, pack: "", metric: "agentic"
  };

  function distinct(fn) {
    var seen = {}, out = [];
    PUZZLES.forEach(function (p) { var v = fn(p); if (!seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }

  function buildFilterOptions() {
    var typeSel = $("typeFilter");
    distinct(function (p) { return p.type; }).sort().forEach(function (t) {
      var o = document.createElement("option");
      o.value = t; o.textContent = t + " (" + PUZZLES.filter(function (p) { return p.type === t; }).length + ")";
      typeSel.appendChild(o);
    });
    var sizeSel = $("sizeFilter");
    var sizes = {};
    PUZZLES.forEach(function (p) { sizes[p.width + "×" + p.height] = 1; });
    Object.keys(sizes).sort(function (a, b) {
      var A = a.split("×").map(Number), B = b.split("×").map(Number);
      return (A[0] * A[1]) - (B[0] * B[1]);
    }).forEach(function (s) {
      var o = document.createElement("option");
      o.value = s; o.textContent = s;
      sizeSel.appendChild(o);
    });
  }

  function filtered() {
    var list = PUZZLES.slice();
    if (filters.search) {
      var q = filters.search.toLowerCase();
      list = list.filter(function (p) { return p.type.indexOf(q) >= 0; });
    }
    if (filters.type) list = list.filter(function (p) { return p.type === filters.type; });
    if (filters.tier) list = list.filter(function (p) { return effectiveTier(p) === filters.tier; });
    if (filters.size) list = list.filter(function (p) { return (p.width + "×" + p.height) === filters.size; });
    if (filters.pack) list = list.filter(function (p) { return (p.pack || "bench") === filters.pack; });
    if (filters.hideSolved) list = list.filter(function (p) { return !store.solved[p.id]; });

    switch (filters.sort) {
      case "area": list.sort(function (a, b) { return a.area - b.area; }); break;
      case "areaDesc": list.sort(function (a, b) { return b.area - a.area; }); break;
      case "hardest":
        list.sort(function (a, b) { return (b.moves / b.area) - (a.moves / a.area); }); break;
      case "aiHardest":
        list.sort(function (a, b) {
          var ra = aiMetric(a), rb = aiMetric(b);
          var va = ra ? ra.solved / ra.total : 2;
          var vb = rb ? rb.solved / rb.total : 2;
          return va - vb;
        });
        break;
      case "unsolved":
        list.sort(function (a, b) { return (store.solved[a.id] ? 1 : 0) - (store.solved[b.id] ? 1 : 0); });
        break;
      default: break;
    }
    return list;
  }

  // ---------------------------------------------------------------- list UI
  function renderList() {
    var list = filtered();
    var ol = $("puzzleList");
    ol.innerHTML = "";
    $("listMeta").textContent = list.length + " puzzle" + (list.length === 1 ? "" : "s");

    var frag = document.createDocumentFragment();
    list.forEach(function (p) {
      var li = document.createElement("li");
      li.className = "puzzle-item";
      li.dataset.id = p.id;
      if (p.id === currentId) li.classList.add("active");
      if (store.solved[p.id]) li.classList.add("solved");

      var am = aiMetric(p);
      var rate = pct(am);
      li.innerHTML =
        '<div class="pi-main">' +
          '<span class="pi-type">' + p.type + "</span>" +
          '<span class="pi-size">' + p.width + "×" + p.height + "</span>" +
        "</div>" +
        '<div class="pi-meta">' +
          tierTag(p) +
          (p.pack === "extra" ? '<span class="tag extra" title="Extra pack (no AI stats)">extra</span>' : "") +
          (rate != null ? '<span class="tag ai" title="' + escapeHtml(aiTooltip(p)) + '">AI ' + rate + "%</span>" : "") +
          (store.solved[p.id] ? '<span class="tag done" title="Your best">✓ ' + fmtTime(store.solved[p.id]) + "</span>" : "") +
        "</div>";
      li.addEventListener("click", function () { selectPuzzle(p.id); });
      frag.appendChild(li);
    });
    ol.appendChild(frag);
  }

  // ---------------------------------------------------------------- player
  var puzzle = null;
  var currentId = null;
  var current = null;
  var timerInt = null, timerSec = 0, completedNow = false;
  var zoom = 1;
  var checkInt = null;
  var hintIdx = 0, revealed = false;

  // Execute a benchmark move string on a pzpr puzzle.
  // Supports compound moves ("mouse,left,1,1;key,4") and the key/cursor commands.
  function applyMove(pz, raw) {
    String(raw).split(";").forEach(function (cmd) {
      var strs = cmd.split(",");
      switch (strs[0]) {
        case "mouse": {
          var m = (strs[1] || "left").match(/(left|right)(.*)/);
          if (!m) return;
          var rr = (m[2] || "").match(/x([0-9]+)/);
          var repeat = rr ? +rr[1] : 1;
          var args = [m[1]];
          for (var i = 2; i < strs.length; i++) {
            if (strs[i] === "bank") break;
            args.push(+strs[i]);
          }
          for (var t = 0; t < repeat; t++) pz.mouse.inputPath.apply(pz.mouse, args);
          break;
        }
        case "key":
          if (pz.key && pz.key.inputKeys) pz.key.inputKeys.apply(pz.key, strs.slice(1));
          break;
        case "cursor":
          if (pz.cursor) pz.cursor.init(+strs[1], +strs[2]);
          break;
        case "clear": pz.clear(); break;
        case "ansclear": pz.ansclear(); break;
        case "playmode": pz.setMode("play"); break;
        case "editmode": pz.setMode("edit"); break;
      }
    });
  }
  function applyMoves(pz, arr) { arr.forEach(function (mv) { try { applyMove(pz, mv); } catch (e) {} }); }
  function currentSolution() { return window.SOLUTIONS && window.SOLUTIONS[currentId]; }

  function stopIntervals() {
    if (timerInt) { clearInterval(timerInt); timerInt = null; }
    if (checkInt) { clearInterval(checkInt); checkInt = null; }
  }

  function computeCell() {
    var wrap = document.querySelector(".board-wrap");
    var availW = wrap ? wrap.clientWidth - 24 : 600;
    var availH = (wrap && wrap.clientHeight > 220)
      ? wrap.clientHeight - 24
      : Math.max(320, window.innerHeight - 260);
    var byW = Math.floor((availW * zoom) / current.width);
    var byH = Math.floor((availH * zoom) / current.height);
    return Math.max(10, Math.min(64, Math.min(byW, byH)));
  }

  function applyCanvasSize() {
    if (!puzzle) return;
    try { puzzle.setCanvasSizeByCellSize(computeCell()); } catch (e) {}
  }

  function startTimer() {
    timerSec = 0;
    $("timer").textContent = "0:00";
    if (timerInt) clearInterval(timerInt);
    timerInt = setInterval(function () {
      if (completedNow) return;
      timerSec++;
      $("timer").textContent = fmtTime(timerSec);
    }, 1000);
  }

  function selectPuzzle(id) {
    var p = PUZZLES.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    currentId = id;
    current = p;
    completedNow = false;
    revealed = false;
    hintIdx = 0;
    zoom = 1;

    $("emptyState").classList.add("hidden");
    $("playerSection").classList.remove("hidden");
    $("puzzleTitle").textContent = titleCase(p.type) + " " + p.width + "×" + p.height;
    if (p.tier) {
      $("puzzleBadge").textContent = p.tier;
      $("puzzleBadge").className = "badge tier-" + p.tier;
      $("puzzleBadge").classList.remove("hidden");
    } else if (p.pack === "extra") {
      $("puzzleBadge").textContent = "extra" + (p.tierEst ? " · ~" + p.tierEst : "");
      $("puzzleBadge").className = "badge pack-extra";
      $("puzzleBadge").classList.remove("hidden");
    } else {
      $("puzzleBadge").textContent = "";
      $("puzzleBadge").className = "badge hidden";
    }
    $("checkMessage").textContent = "";
    $("checkMessage").className = "check-message";
    $("puzzlinkLink").href = "https://puzz.link/p?" + p.pzpr_url;
    $("puzzlinkLink").classList.remove("hidden");

    renderStats(p);
    renderAI(p);
    loadRules(p.type);

    // (re)create the pzpr player in a fresh container
    stopIntervals();
    var host = $("puzzleContainer");
    host.innerHTML = "";
    puzzle = null;

    var container = document.createElement("div");
    host.appendChild(container);

    try {
      puzzle = new pzpr.Puzzle(container, { type: "player" });
      puzzle.once("ready", function () {
        try { puzzle.setMode("play"); } catch (e) {}
        try { puzzle.setCanvasSizeByCellSize(computeCell()); } catch (e) {}
      });
      puzzle.open(p.pzpr_url);
      window.__pp_puzzle = puzzle;
    } catch (e) {
      $("checkMessage").textContent = "Failed to load puzzle: " + e.message;
      $("checkMessage").className = "check-message error";
      return;
    }

    startTimer();
    checkInt = setInterval(checkCompletion, 400);

    // mark active in list
    Array.prototype.forEach.call(document.querySelectorAll(".puzzle-item"), function (el) {
      el.classList.toggle("active", el.dataset.id === id);
    });

    closeNav();
  }

  // ---------------------------------------------------------------- mobile nav
  function closeNav() { document.body.classList.remove("nav-open"); }
  function toggleNav() { document.body.classList.toggle("nav-open"); }
  $("menuBtn").addEventListener("click", toggleNav);
  $("scrim").addEventListener("click", closeNav);

  function checkCompletion() {
    if (!puzzle || completedNow || revealed) return;
    var r;
    try { r = puzzle.check(false); } catch (e) { return; }
    if (r && r.complete) onSolved();
  }

  function setCheck(text, cls) {
    var msg = $("checkMessage");
    msg.textContent = text;
    msg.className = "check-message" + (cls ? " " + cls : "");
  }

  function onSolved() {
    completedNow = true;
    if (timerInt) { clearInterval(timerInt); timerInt = null; }
    setCheck("Complete ✓", "complete");

    var prev = store.solved[currentId];
    var isBest = prev == null || timerSec < prev;
    if (isBest) { store.solved[currentId] = timerSec; saveStore(); }

    renderList();
    updateProgress();
    showModal(timerSec, isBest);
  }

  // ---------------------------------------------------------------- buttons
  $("btnCheck").addEventListener("click", function () {
    if (!puzzle) return;
    var r = puzzle.check(true);
    if (r && r.complete) { onSolved(); return; }
    var text = (r && r.gettext && r.gettext("en")) || "Not solved yet — keep going.";
    $("checkMessage").textContent = text;
    $("checkMessage").className = "check-message error";
    setTimeout(function () {
      try { puzzle.board.errclear(); } catch (e) {}
    }, 3500);
  });

  $("btnHint").addEventListener("click", function () {
    if (!puzzle) return;
    var sol = currentSolution();
    if (!sol || !sol.required || !sol.required.length) {
      setCheck("No hints available for this puzzle.", "error");
      return;
    }
    while (hintIdx < sol.required.length) {
      var before = "";
      try { before = puzzle.getFileData(); } catch (e) {}
      applyMove(puzzle, sol.required[hintIdx]);
      hintIdx++;
      var after = "";
      try { after = puzzle.getFileData(); } catch (e) {}
      if (before !== after) {
        setCheck("Hint " + hintIdx + " of " + sol.required.length + " revealed.", "");
        return;
      }
    }
    setCheck("No more hints to give (all required moves applied).", "");
  });

  $("btnSolve").addEventListener("click", function () {
    if (!puzzle) return;
    var sol = currentSolution();
    if (!sol || !sol.full || !sol.full.length) {
      setCheck("No solution available for this puzzle.", "error");
      return;
    }
    if (!confirm("Reveal the full solution? It won't count as a solve.")) return;
    revealed = true;
    completedNow = true;
    if (checkInt) { clearInterval(checkInt); checkInt = null; }
    if (timerInt) { clearInterval(timerInt); timerInt = null; }
    try { puzzle.ansclear(); } catch (e) {}
    applyMoves(puzzle, sol.full);
    setCheck("Solution revealed — pick another puzzle to keep your streak :)", "");
  });

  $("btnUndo").addEventListener("click", function () { if (puzzle) puzzle.undo(); });
  $("btnReset").addEventListener("click", function () {
    if (!puzzle) return;
    puzzle.ansclear();
    completedNow = false;
    revealed = false;
    hintIdx = 0;
    if (!timerInt && !store.solved[currentId]) startTimer();
    $("checkMessage").textContent = "";
    $("checkMessage").className = "check-message";
  });
  $("btnZoomIn").addEventListener("click", function () {
    zoom = Math.min(2.4, zoom + 0.15); applyCanvasSize();
  });
  $("btnZoomOut").addEventListener("click", function () {
    zoom = Math.max(0.5, zoom - 0.15); applyCanvasSize();
  });

  window.addEventListener("resize", function () { applyCanvasSize(); });

  // ---------------------------------------------------------------- stats
  function renderStats(p) {
    $("statGrid").textContent = p.width + "×" + p.height + " cells";
    if (p.tier) {
      $("statTier").textContent = p.tier;
    } else if (p.pack === "extra" && p.tierEst) {
      $("statTier").textContent = "~" + p.tierEst + " (est.)";
    } else {
      $("statTier").textContent = "—";
    }
    $("statMoves").textContent = p.moves != null ? p.moves : "—";
    var r = aiRates(p);
    $("statAIa").textContent = r.agentic ? (r.agentic.solved + " / " + r.agentic.total + "  (" + pct(r.agentic) + "%)") : "not run";
    $("statAId").textContent = r.direct ? (r.direct.solved + " / " + r.direct.total + "  (" + pct(r.direct) + "%)") : "not run";
    $("statBest").textContent = store.solved[p.id] ? fmtTime(store.solved[p.id]) : "not solved";
  }

  function renderAI(p) {
    var listEl = $("aiList");
    var sumEl = $("aiSummary");
    listEl.innerHTML = "";
    if (!hasAI(p)) {
      sumEl.textContent = "No per-puzzle AI results available for this puzzle.";
      $("aiBlock").style.display = "";
      return;
    }
    var solved = aiSolved(p), total = aiTotal(p);
    var r = aiRates(p), parts = [];
    if (r.agentic) parts.push("agentic " + r.agentic.solved + "/" + r.agentic.total + " (" + pct(r.agentic) + "%)");
    if (r.direct) parts.push("direct ask " + r.direct.solved + "/" + r.direct.total + " (" + pct(r.direct) + "%)");
    sumEl.textContent = (parts.length ? "AI solve rate — " + parts.join(" · ") + ". " : "") +
      "Fastest solvers below — can you beat them?";
    p.ai.times.slice(0, 8).forEach(function (t, i) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="ai-rank">' + (i + 1) + "</span>" +
        '<span class="ai-name">' + escapeHtml(t.model) + "</span>" +
        '<span class="ai-time">' + fmtTime(t.time) + "</span>";
      listEl.appendChild(li);
    });
    if (p.ai.times.length > 8) {
      var li = document.createElement("li");
      li.className = "more";
      li.textContent = "+ " + (p.ai.times.length - 8) + " more…";
      listEl.appendChild(li);
    }
  }

  // ---------------------------------------------------------------- rules
  var rulesCache = {};
  function loadRules(type) {
    var pid = type;
    try { pid = pzpr.variety.toPID(type) || type; } catch (e) {}
    if (rulesCache[pid]) { renderRules(rulesCache[pid]); return; }
    $("rulesText").textContent = "Loading rules…";

    var captured = { rules: null, data: null };
    window.ui = window.ui || {}; window.ui.debug = window.ui.debug || {};
    window.ui.debug.addRules = function (name, r) { captured.rules = r; };
    window.ui.debug.addDebugData = function (name, d) { captured.data = d; };

    if (document.getElementById("rules-" + pid)) return; // already loading/loaded
    var s = document.createElement("script");
    s.id = "rules-" + pid;
    s.src = "vendor/pzprjs/dist/js/pzpr-samples/" + pid + ".js";
    s.onload = function () {
      if (!captured.rules) return;
      rulesCache[pid] = captured;
      if (current && (current.type === type)) renderRules(captured);
    };
    document.head.appendChild(s);
  }

  function renderRules(captured) {
    var rules = captured.rules && captured.rules[0] && captured.rules[0].rules;
    var el = $("rulesText");
    if (!rules) { el.textContent = "No rules text available."; return; }
    el.innerHTML = rules.split("\n").filter(function (l) { return l.trim(); })
      .map(function (l) { return "<p>" + escapeHtml(l.trim()) + "</p>"; }).join("");

    var data = captured.data;
    var box = $("ruleExamples");
    box.innerHTML = "";
    if (!data || !data.failcheck || !data.failcheck.length) {
      box.innerHTML = '<p class="muted">No examples for this type.</p>';
      return;
    }
    data.failcheck.slice(0, 6).forEach(function (entry) {
      if (entry.length > 2 && entry[2] && entry[2].skiprules) return;
      var wrap = document.createElement("div");
      wrap.className = "rule-example";
      var canvas = document.createElement("div");
      canvas.className = "rule-example-canvas";
      var label = document.createElement("div");
      label.className = "rule-example-label";
      label.textContent = "…";
      wrap.appendChild(canvas); wrap.appendChild(label);
      box.appendChild(wrap);
      try {
        var vp = new pzpr.Puzzle(canvas, { type: "viewer" });
        vp.setConfig("autocmp", false);
        vp.setConfig("forceallcell", true);
        vp.once("ready", function () {
          try {
            var res = vp.check(true);
            label.textContent = (res.complete ? "OK" : "NG") +
              (res.complete ? "" : ": " + res.gettext("en"));
            label.className = "rule-example-label " + (res.complete ? "ok" : "ng");
            vp.setCanvasSizeByCellSize(18);
          } catch (e) {}
        });
        vp.open(entry[1]);
      } catch (e) {}
    });
  }

  // ---------------------------------------------------------------- modal
  function showModal(sec, isBest) {
    $("modalText").textContent = "You solved this " + current.type + " in " + fmtTime(sec) + "." +
      (isBest ? " New personal best!" : " (best: " + fmtTime(store.solved[currentId]) + ")");
    var rankEl = $("modalRank");
    if (hasAI(current)) {
      var times = current.ai.times.map(function (t) { return t.time; });
      var rank = times.filter(function (t) { return t <= sec; }).length + 1;
      rankEl.textContent = "That would rank #" + rank + " of " + (times.length + 1) +
        " vs. the AI models that solved it.";
    } else if (current.ai) {
      rankEl.textContent = "No AI model in the benchmark solved this one — you beat them all.";
    } else {
      rankEl.textContent = "";
    }
    $("completeModal").classList.add("show");
  }
  $("modalClose").addEventListener("click", function () { $("completeModal").classList.remove("show"); });
  $("completeModal").addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("show");
  });
  $("modalNext").addEventListener("click", function () {
    $("completeModal").classList.remove("show");
    var list = filtered();
    var i = list.map(function (p) { return p.id; }).indexOf(currentId);
    var next = list[(i + 1) % list.length];
    if (next) selectPuzzle(next.id);
  });

  // ---------------------------------------------------------------- progress
  function updateProgress() {
    var n = Object.keys(store.solved).length;
    $("solvedCount").textContent = n;
    $("totalCount").textContent = PUZZLES.length;
    var pct = Math.round(100 * n / PUZZLES.length);
    $("progressPct").textContent = pct + "%";
    var ring = $("progressRing");
    ring.style.background = "conic-gradient(var(--accent) " + (pct * 3.6) + "deg, var(--ring) 0deg)";
  }
  $("resetProgress").addEventListener("click", function () {
    if (confirm("Clear all local progress and best times?")) {
      store.solved = {}; saveStore(); renderList(); updateProgress();
    }
  });

  // ---------------------------------------------------------------- events
  $("search").addEventListener("input", function (e) { filters.search = e.target.value; renderList(); });
  $("typeFilter").addEventListener("change", function (e) { filters.type = e.target.value; renderList(); });
  $("tierFilter").addEventListener("change", function (e) { filters.tier = e.target.value; renderList(); });
  $("sizeFilter").addEventListener("change", function (e) { filters.size = e.target.value; renderList(); });
  $("sortFilter").addEventListener("change", function (e) { filters.sort = e.target.value; renderList(); });
  $("packFilter").addEventListener("change", function (e) { filters.pack = e.target.value; renderList(); });
  $("metricFilter").addEventListener("change", function (e) {
    filters.metric = e.target.value;
    renderList();
    if (current) { renderStats(current); renderList(); }
  });
  $("hideSolved").addEventListener("change", function (e) { filters.hideSolved = e.target.checked; renderList(); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.ctrlKey) { $("btnCheck").click(); }
    if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (puzzle) puzzle.undo(); }
  });

  // ---------------------------------------------------------------- init
  buildFilterOptions();
  renderList();
  updateProgress();

  // deep-link support: #puz=<id>
  var m = /(?:^|[#&])puz=([^&]+)/.exec(location.hash);
  if (m) selectPuzzle(decodeURIComponent(m[1]));
  window.__pp_select = selectPuzzle;

  // offline / installable (PWA). Skipped inside the native Capacitor app,
  // which already bundles all assets locally.
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if ("serviceWorker" in navigator && location.protocol !== "file:" && !isNative) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
