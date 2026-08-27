(() => {
  "use strict";

  const data = window.CROSSCURRENTS_DATA;
  if (!data) {
    document.body.innerHTML = "<p class='fatal-error'>The data snapshot could not be loaded.</p>";
    return;
  }

  const factionById = Object.fromEntries(data.factions.map((faction) => [faction.id, faction]));
  const sourceById = Object.fromEntries(data.sources.map((source) => [source.id, source]));
  const domainById = Object.fromEntries(data.domains.map((domain) => [domain.id, domain]));
  const defaultIncluded = data.metrics.filter((metric) => metric.included).map((metric) => metric.id);
  const defaultWeights = Object.fromEntries(data.domains.map((domain) => [domain.id, domain.defaultWeight]));
  const completeMetricIds = new Set(data.metrics
    .filter((metric) => data.factions.every((faction) => Number.isFinite(metric.values[faction.id])))
    .map((metric) => metric.id));
  const exportDate = data.meta.generatedOn || data.meta.editorialAsOf;
  const presets = {
    balanced: defaultWeights,
    primaries: { institutional: 10, electoral: 55, money: 20, agenda: 15, momentum: 0 },
    institutions: { institutional: 55, electoral: 15, money: 15, agenda: 15, momentum: 0 },
    grassroots: { institutional: 10, electoral: 30, money: 45, agenda: 15, momentum: 0 }
  };

  const storedWeights = loadPreference("dpi-weights", defaultWeights);
  const storedMeasures = loadPreference("dpi-measures", defaultIncluded);
  const metricIds = new Set(data.metrics.map((metric) => metric.id));
  const state = {
    weights: Object.fromEntries(data.domains.map((domain) => {
      const candidate = Number(storedWeights?.[domain.id]);
      return [domain.id, Number.isFinite(candidate) ? candidate : domain.defaultWeight];
    })),
    included: new Set((Array.isArray(storedMeasures) ? storedMeasures : defaultIncluded).filter((id) => metricIds.has(id) && completeMetricIds.has(id))),
    raceFilter: "all",
    metricFilter: "all"
  };

  function loadPreference(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" ? value : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem("dpi-weights", JSON.stringify(state.weights));
      localStorage.setItem("dpi-measures", JSON.stringify([...state.included]));
    } catch {
      // The dashboard still works when local storage is unavailable.
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function displayDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
    const date = new Date(`${value}T00:00:00Z`);
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
  }

  function compactMoney(value) {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: value >= 1_000_000 ? 2 : 0 }).format(value);
  }

  function formatMetric(value, format) {
    if (value === null || value === undefined) return "N/A";
    if (format === "currency") return compactMoney(value);
    if (format === "percent") return `${value.toFixed(value % 1 ? 1 : 0)}%`;
    if (format === "signed") return `${value > 0 ? "+" : ""}${value}`;
    if (format === "points") return `${value} pts`;
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
  }

  function sourceLink(sourceId, label = "Source") {
    const source = sourceById[sourceId];
    if (!source) return "";
    return `<a href="${escapeHtml(source.url)}" ${source.url.startsWith("#") ? "" : 'target="_blank" rel="noreferrer"'}>${escapeHtml(label)} ↗</a>`;
  }

  function valuesAreComplete(values) {
    return data.factions.every((faction) => Number.isFinite(values?.[faction.id]));
  }

  function normalisedValue(metric, factionId, metricSnapshot = null) {
    const values = metricSnapshot?.[metric.id] || metric.values;
    if (!valuesAreComplete(values)) return null;
    const raw = values[factionId];
    if (raw === null || raw === undefined || Number.isNaN(raw)) return null;
    const available = data.factions.map((faction) => values[faction.id]);
    if (available.length < 2) return 50;
    const min = Math.min(...available);
    const max = Math.max(...available);
    if (max === min) return 50;
    return (raw - min) / (max - min) * 100;
  }

  function calculateScores(metricSnapshot = null, allowedMetricIds = null) {
    return data.factions.map((faction) => {
      const domainScores = {};
      for (const domain of data.domains) {
        const scores = data.metrics
          .filter((metric) => metric.domain === domain.id && state.included.has(metric.id) && (!allowedMetricIds || allowedMetricIds.has(metric.id)))
          .map((metric) => normalisedValue(metric, faction.id, metricSnapshot))
          .filter((score) => score !== null);
        domainScores[domain.id] = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
      }
      let weighted = 0;
      let weightTotal = 0;
      for (const domain of data.domains) {
        if (domainScores[domain.id] === null || Number(state.weights[domain.id]) === 0) continue;
        weighted += domainScores[domain.id] * Number(state.weights[domain.id]);
        weightTotal += Number(state.weights[domain.id]);
      }
      return { faction, domainScores, total: weightTotal ? weighted / weightTotal : null };
    }).sort((a, b) => {
      if (a.total === null && b.total === null) return 0;
      if (a.total === null) return 1;
      if (b.total === null) return -1;
      return b.total - a.total;
    });
  }

  function renderScores() {
    const scores = calculateScores();
    const leader = scores.find((score) => score.total !== null);
    document.querySelector("#index-leader").textContent = leader ? `${leader.faction.shortName} · ${leader.total.toFixed(1)}` : "No active model";
    const strongest = leader ? Object.entries(leader.domainScores)
      .filter(([, value]) => value !== null)
      .sort((a, b) => b[1] - a[1])[0] : null;
    document.querySelector("#leader-explanation").textContent = leader && strongest
      ? `${leader.faction.name} is strongest here on ${domainById[strongest[0]].label.toLowerCase()} power. Change the model to test how stable that lead is.`
      : "Turn on at least one complete measure and give its domain a non-zero weight.";
    document.querySelector("#active-measure-count").textContent = state.included.size;

    document.querySelector("#score-cards").innerHTML = scores.map((score, index) => `
      <article class="score-card" style="--faction:${score.faction.color}">
        <div class="rank">${score.total === null ? "—" : `0${index + 1}`}</div>
        <div class="score-main">
          <div class="score-name"><div><p>${escapeHtml(score.faction.name)}</p><span>${escapeHtml(score.faction.membershipNote)}</span></div><strong>${score.total === null ? "—" : score.total.toFixed(1)}</strong></div>
          <div class="score-track"><span style="width:${score.total === null ? 0 : Math.max(2, score.total)}%"></span></div>
          <div class="domain-scores">${data.domains.map((domain) => `<span><b>${domain.label}</b>${score.domainScores[domain.id] === null ? "—" : score.domainScores[domain.id].toFixed(0)}</span>`).join("")}</div>
        </div>
      </article>`).join("");
    renderHistory();
  }

  function renderHistory() {
    const history = Array.isArray(data.history) ? data.history : [];
    const comparableMetricIds = new Set([...state.included].filter((metricId) => history.length > 0 && history.every((snapshot) => valuesAreComplete(snapshot.metrics?.[metricId]))));
    document.querySelector("#history-count").textContent = history.length;
    document.querySelector("#history-measure-count").textContent = comparableMetricIds.size;

    document.querySelector("#freshness-grid").innerHTML = Object.values(data.meta.feeds || {}).map((feed) => {
      const coverage = feed.coverageByFaction
        ? `<small>${data.factions.map((faction) => `${faction.shortName} ${displayDate(feed.coverageByFaction[faction.id], { month: "short", day: "numeric" })}`).join(" · ")}</small>`
        : "";
      return `<article><span>${escapeHtml(feed.updateMode)}</span><h3>${escapeHtml(feed.label)}</h3><strong>${displayDate(feed.asOf)}</strong>${coverage}</article>`;
    }).join("");

    if (!history.length) {
      document.querySelector("#history-rows").innerHTML = "<p>No snapshots have been recorded yet.</p>";
      return;
    }

    const scoredHistory = history.map((snapshot, index) => {
      const scores = calculateScores(snapshot.metrics, comparableMetricIds);
      const previousScores = index > 0 ? calculateScores(history[index - 1].metrics, comparableMetricIds) : [];
      return { snapshot, scores, previousScores };
    }).reverse();

    document.querySelector("#history-rows").innerHTML = scoredHistory.map(({ snapshot, scores, previousScores }) => {
      const leader = scores.find((score) => score.total !== null);
      const scoreCells = data.factions.map((faction) => {
        const score = scores.find((item) => item.faction.id === faction.id);
        const previous = previousScores.find((item) => item.faction.id === faction.id);
        const delta = Number.isFinite(score?.total) && Number.isFinite(previous?.total) ? score.total - previous.total : null;
        const change = delta === null ? "baseline" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
        return `<span style="--history-faction:${faction.color}"><b>${faction.shortName}</b><strong>${Number.isFinite(score?.total) ? score.total.toFixed(1) : "—"}</strong><i class="${delta > 0 ? "up" : delta < 0 ? "down" : ""}">${change}</i></span>`;
      }).join("");
      return `<article><div><time datetime="${snapshot.date}">${displayDate(snapshot.date)}</time><p>${escapeHtml(snapshot.label)}</p><strong>${leader ? `${leader.faction.shortName} leads` : "No comparable model"}</strong></div><div class="history-scores">${scoreCells}</div><small>Editorial ${displayDate(snapshot.editorialAsOf)} · FEC ${displayDate(snapshot.fecAsOf)}</small></article>`;
    }).join("");
  }

  function renderWeightControls() {
    document.querySelector("#weight-controls").innerHTML = data.domains.map((domain) => `
      <label class="weight-control" for="weight-${domain.id}">
        <span><strong>${domain.label}</strong><output id="weight-output-${domain.id}">${state.weights[domain.id]}%</output></span>
        <input id="weight-${domain.id}" data-domain="${domain.id}" type="range" min="0" max="60" step="5" value="${state.weights[domain.id]}" />
        <small>${domain.description}</small>
      </label>`).join("");

    document.querySelectorAll(".weight-control input").forEach((input) => input.addEventListener("input", () => {
      state.weights[input.dataset.domain] = Number(input.value);
      document.querySelector(`#weight-output-${input.dataset.domain}`).textContent = `${input.value}%`;
      document.querySelectorAll("[data-preset]").forEach((button) => button.classList.remove("active"));
      savePreferences();
      renderScores();
    }));
  }

  function applyPreset(name) {
    state.weights = { ...presets[name] };
    renderWeightControls();
    renderScores();
    savePreferences();
    document.querySelectorAll("[data-preset]").forEach((button) => button.classList.toggle("active", button.dataset.preset === name));
  }

  function renderInstitutions() {
    const metricIds = ["published_members", "democratic_leadership_offices", "standing_committee_ranking_members"];
    document.querySelector("#institution-bars").innerHTML = metricIds.map((metricId) => {
      const metric = data.metrics.find((item) => item.id === metricId);
      const max = Math.max(...Object.values(metric.values).filter((value) => value !== null));
      return `<article class="institution-block"><div><h3>${metric.label}</h3><p>${metric.description}</p></div><div>${data.factions.map((faction) => {
        const value = metric.values[faction.id];
        return `<div class="institution-row"><span>${faction.shortName}</span><div><i style="width:${value / max * 100}%;background:${faction.color}"></i></div><strong>${formatMetric(value, metric.format)}</strong></div>`;
      }).join("")}</div><details><summary>Read caveat</summary><p>${metric.caveat}</p></details></article>`;
    }).join("");

    document.querySelector("#overlap-grid").innerHTML = `<article class="overlap-lead"><p class="kicker">OVERLAP MAP</p><h3>Bridge members matter.</h3><p>Formal caucuses are networks, not mutually exclusive teams. Dual members can move policy and information between blocs.</p></article>` + data.overlaps.map((overlap) => {
      const left = factionById[overlap.left];
      const right = factionById[overlap.right];
      return `<article class="overlap-card"><div class="overlap-circles"><i style="background:${left.color}"></i><i style="background:${right.color}"></i><strong>${overlap.count}</strong></div><h3>${left.shortName} × ${right.shortName}</h3><p>${overlap.note}</p><span>Jaccard overlap ${overlap.jaccard.toFixed(1)}%</span></article>`;
    }).join("");
  }

  function raceWinUnits(race) {
    return race.result.startsWith("3–0") ? 3 : 1;
  }

  function renderPrimaryPulse() {
    const groups = [
      { id: "progressive", label: "Progressive / left", color: factionById.progressive.color },
      { id: "newdem", label: "Center / institutional", color: factionById.newdem.color },
      { id: "bluedog", label: "Blue Dog", color: factionById.bluedog.color },
      { id: "other", label: "Other insurgents", color: "#665c78" }
    ];
    const totals = groups.map((group) => ({ ...group, count: data.primaryRaces.filter((race) => race.alignmentId === group.id).reduce((sum, race) => sum + raceWinUnits(race), 0) }));
    const max = Math.max(...totals.map(({ count }) => count));
    document.querySelector("#primary-pulse").innerHTML = totals.map((group) => `
      <article style="--group:${group.color}"><div><p>${group.label}</p><strong>${group.count}</strong></div><div class="pulse-track"><span style="width:${group.count / max * 100}%"></span></div><small>coded win units in the curated race set</small></article>`).join("");
  }

  function renderRaces() {
    const races = data.primaryRaces.filter((race) => state.raceFilter === "all" || race.alignmentId === state.raceFilter);
    document.querySelector("#race-body").innerHTML = races.map((race) => `
      <tr>
        <td><time datetime="${race.date}">${displayDate(race.date, { month: "short", day: "numeric" })}</time></td>
        <td><strong>${escapeHtml(race.race)}</strong></td>
        <td><strong>${escapeHtml(race.winner)}</strong><span class="alignment-pill ${race.alignmentId}">${escapeHtml(race.alignment)}</span></td>
        <td>${escapeHtml(race.result)}${race.margin !== null ? `<span class="margin">+${race.margin.toFixed(1)} pts</span>` : ""}</td>
        <td>${escapeHtml(race.stakes)}</td>
        <td>${sourceLink(race.source, sourceById[race.source]?.publisher || "Source")}</td>
      </tr>`).join("");
  }

  function renderMoney() {
    const plot = document.querySelector("#money-scatter");
    plot.querySelectorAll(".scatter-point").forEach((point) => point.remove());
    const chartRows = data.financeRaces.filter((race) => race.winnerReceipts && race.opponentReceipts);
    chartRows.forEach((race) => {
      const ratio = race.winnerReceipts / race.opponentReceipts;
      const margin = race.winnerVoteShare - race.opponentVoteShare;
      const left = 8 + Math.min(ratio, 1.5) / 1.5 * 84;
      const bottom = 10 + Math.min(Math.max(margin, 0), 22) / 22 * 78;
      const outside = race.outsideAgainstWinner || race.outsideAgainstOpponent || 0;
      const size = 26 + Math.min(28, Math.sqrt(outside / 1_000_000) * 5);
      const faction = factionById[race.alignmentId];
      const point = document.createElement("button");
      point.className = "scatter-point";
      point.style.cssText = `left:${left}%;bottom:${bottom}%;width:${size}px;height:${size}px;--point:${faction?.color || "#665c78"}`;
      point.innerHTML = `<span>${escapeHtml(race.winner.split(" ").at(-1))}</span>`;
      point.title = `${displayDate(race.date)} — ${race.winner}: +${margin.toFixed(1)} points; raised ${(ratio * 100).toFixed(0)}% as much as ${race.opponent}${outside ? `; ${compactMoney(outside)} in sourced outside opposition` : ""}`;
      plot.append(point);
    });

    document.querySelector("#money-cases").innerHTML = chartRows.map((race) => {
      const ratio = race.winnerReceipts / race.opponentReceipts;
      const margin = race.winnerVoteShare - race.opponentVoteShare;
      return `<article style="--case:${factionById[race.alignmentId]?.color || "#665c78"}"><div><span>${displayDate(race.date, { month: "short", year: "numeric" })} · ${escapeHtml(race.race)}</span><strong>+${margin.toFixed(1)} pts</strong></div><h3>${escapeHtml(race.winner)}</h3><p>Raised <b>${compactMoney(race.winnerReceipts)}</b> vs ${compactMoney(race.opponentReceipts)} — ${(ratio * 100).toFixed(0)}¢ per opponent dollar.</p>${race.outsideAgainstWinner ? `<p class="outside">At least ${compactMoney(race.outsideAgainstWinner)} spent against the winner.</p>` : ""}<div>${race.sources.map((sourceId) => sourceLink(sourceId, sourceById[sourceId]?.publisher)).join("")}</div></article>`;
    }).join("");

    const contextRows = data.financeRaces.filter((race) => !race.winnerReceipts || !race.opponentReceipts);
    document.querySelector("#money-context").innerHTML = contextRows.map((race) => {
      const margin = race.winnerVoteShare - race.opponentVoteShare;
      const outside = race.outsideAgainstWinner || race.outsideAgainstOpponent || 0;
      const role = race.sampleRole || "Result context; comparable fundraising totals unavailable";
      return `<article><div><span>${displayDate(race.date)}</span><strong>${escapeHtml(role)}</strong></div><h3>${escapeHtml(race.winner)} · ${escapeHtml(race.race)}</h3><p>Won by ${margin.toFixed(1)} points.${outside ? ` Sourced outside spending: ${compactMoney(outside)}.` : ""}</p><footer>${race.sources.map((sourceId) => sourceLink(sourceId, sourceById[sourceId]?.publisher)).join("")}</footer></article>`;
    }).join("");
  }

  function renderMood() {
    document.querySelector("#mood-grid").innerHTML = data.publicIndicators.map((indicator) => `
      <article><div class="mood-value">${indicator.value}<span>%</span></div><h3>${escapeHtml(indicator.label)}</h3><p class="mood-comparison">${escapeHtml(indicator.comparison)}</p><p>${escapeHtml(indicator.interpretation)}</p><footer><span>${escapeHtml(indicator.fieldDate)}</span>${sourceLink(indicator.source, sourceById[indicator.source]?.publisher)}</footer></article>`).join("");
  }

  function statusGroup(status) {
    const lower = status.toLowerCase();
    if (lower.includes("live")) return "live";
    if (lower.includes("ready") || lower.includes("partial") || lower.includes("after") || lower.includes("export")) return "ready";
    return "build";
  }

  function renderCatalogue() {
    const entries = Object.values(data.measureCatalogue).flat();
    document.querySelector("#catalogue-count").textContent = entries.length;
    const groupCounts = entries.reduce((counts, [, status]) => {
      const group = statusGroup(status);
      counts[group] = (counts[group] || 0) + 1;
      return counts;
    }, {});
    document.querySelector("#coverage-legend").innerHTML = `<span class="status live">${groupCounts.live || 0} live</span><span class="status ready">${groupCounts.ready || 0} source-ready / partial</span><span class="status build">${groupCounts.build || 0} needs collection</span>`;
    document.querySelector("#measure-catalogue").innerHTML = Object.entries(data.measureCatalogue).map(([category, items], index) => `
      <details ${index === 0 ? "open" : ""}><summary><span>${escapeHtml(category)}</span><strong>${items.length}</strong></summary><div>${items.map(([label, status]) => `<p><span>${escapeHtml(label)}</span><i class="status ${statusGroup(status)}">${escapeHtml(status)}</i></p>`).join("")}</div></details>`).join("");
  }

  function renderMetricFilter() {
    document.querySelector("#metric-filter").innerHTML = `<button type="button" data-domain="all" class="active">All</button>` + data.domains.map((domain) => `<button type="button" data-domain="${domain.id}">${domain.label}</button>`).join("");
    document.querySelectorAll("#metric-filter button").forEach((button) => button.addEventListener("click", () => {
      state.metricFilter = button.dataset.domain;
      document.querySelectorAll("#metric-filter button").forEach((item) => item.classList.toggle("active", item === button));
      renderMetricTable();
    }));
  }

  function renderMetricTable() {
    const metrics = data.metrics.filter((metric) => state.metricFilter === "all" || metric.domain === state.metricFilter);
    document.querySelector("#metric-body").innerHTML = metrics.map((metric) => `
      <tr class="${state.included.has(metric.id) ? "included" : ""} ${completeMetricIds.has(metric.id) ? "" : "incomplete"}">
        <td><input type="checkbox" data-metric="${metric.id}" ${state.included.has(metric.id) ? "checked" : ""} ${completeMetricIds.has(metric.id) ? "" : "disabled"} aria-label="${completeMetricIds.has(metric.id) ? "Include" : "Cannot include incomplete"} ${escapeHtml(metric.label)} in score" /></td>
        <td><details><summary><strong>${escapeHtml(metric.label)}</strong><span>${domainById[metric.domain].label}${completeMetricIds.has(metric.id) ? "" : " · reference only"}</span></summary><p>${escapeHtml(metric.description)}</p><small>${escapeHtml(metric.caveat)}</small></details></td>
        ${data.factions.map((faction) => `<td>${formatMetric(metric.values[faction.id], metric.format)}</td>`).join("")}
        <td>${displayDate(metric.asOf, { month: "short", year: "numeric" })}</td>
        <td class="evidence-links">${metric.sources.slice(0, 3).map((sourceId) => sourceLink(sourceId, sourceById[sourceId]?.publisher)).join("")}${metric.sources.length > 3 ? `<span>+${metric.sources.length - 3}</span>` : ""}</td>
      </tr>`).join("");
    document.querySelectorAll("[data-metric]").forEach((checkbox) => checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.included.add(checkbox.dataset.metric);
      else state.included.delete(checkbox.dataset.metric);
      savePreferences();
      renderScores();
      renderMetricTable();
    }));
    const allCompleteEnabled = [...completeMetricIds].every((metricId) => state.included.has(metricId));
    document.querySelector("#toggle-all-metrics").textContent = allCompleteEnabled ? "Restore defaults" : "Include all complete";
  }

  function renderTimeline() {
    document.querySelector("#timeline").innerHTML = data.events.map((event) => {
      const faction = factionById[event.faction];
      return `<article style="--event:${faction.color}"><time datetime="${event.date}">${displayDate(event.date, { month: "short", day: "numeric" })}</time><div class="timeline-dot"></div><div><p><span>${escapeHtml(event.type)}</span>${event.points ? `<b>+${event.points} pts</b>` : ""}</p><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.summary)}</p>${sourceLink(event.source, sourceById[event.source]?.publisher)}</div></article>`;
    }).join("");
  }

  function renderSources(query = "") {
    const needle = query.trim().toLowerCase();
    const sources = data.sources.filter((source) => [source.publisher, source.title, source.kind].join(" ").toLowerCase().includes(needle));
    document.querySelector("#source-list").innerHTML = sources.map((source, index) => `
      <article><span>${String(index + 1).padStart(2, "0")}</span><div><p>${escapeHtml(source.kind.replaceAll("-", " "))} · accessed ${displayDate(source.accessed, { month: "short", day: "numeric", year: "numeric" })}</p><h3>${escapeHtml(source.title)}</h3><strong>${escapeHtml(source.publisher)}</strong></div><a href="${escapeHtml(source.url)}" ${source.url.startsWith("#") ? "" : 'target="_blank" rel="noreferrer"'}>Open ↗</a></article>`).join("");
  }

  function downloadFile(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function bindInteractions() {
    document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset)));
    document.querySelector("#reset-model").addEventListener("click", () => {
      state.included = new Set(defaultIncluded);
      applyPreset("balanced");
      renderMetricTable();
    });
    document.querySelector("#toggle-all-metrics").addEventListener("click", () => {
      const allEnabled = [...completeMetricIds].every((metricId) => state.included.has(metricId));
      state.included = new Set(allEnabled ? defaultIncluded : completeMetricIds);
      savePreferences();
      renderScores();
      renderMetricTable();
    });
    document.querySelectorAll("#race-filters button").forEach((button) => button.addEventListener("click", () => {
      state.raceFilter = button.dataset.filter;
      document.querySelectorAll("#race-filters button").forEach((item) => item.classList.toggle("active", item === button));
      renderRaces();
    }));
    document.querySelector("#source-search").addEventListener("input", (event) => renderSources(event.target.value));
    document.querySelector("#download-json").addEventListener("click", () => downloadFile(`democratic-power-index-${exportDate}.json`, JSON.stringify(data, null, 2), "application/json"));
    document.querySelector("#download-races").addEventListener("click", () => {
      const headers = ["date", "race", "winner", "alignment", "result", "margin_points", "general_election_stakes", "source_url"];
      const rows = data.primaryRaces.map((race) => [race.date, race.race, race.winner, race.alignment, race.result, race.margin, race.stakes, sourceById[race.source]?.url]);
      downloadFile(`democratic-primary-tracker-${exportDate}.csv`, [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
    });
    const dialog = document.querySelector("#method-dialog");
    document.querySelector("#open-method").addEventListener("click", () => dialog.showModal());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  document.querySelector("#snapshot-date").textContent = displayDate(data.meta.editorialAsOf);
  document.querySelector("#footer-date").textContent = displayDate(data.meta.editorialAsOf);
  renderWeightControls();
  renderScores();
  renderInstitutions();
  renderPrimaryPulse();
  renderRaces();
  renderMoney();
  renderMood();
  renderCatalogue();
  renderMetricFilter();
  renderMetricTable();
  renderTimeline();
  renderSources();
  bindInteractions();
})();
