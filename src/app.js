import { signals } from "./data.js";

const issueFilter = document.querySelector("#issue-filter");
const typeFilter = document.querySelector("#type-filter");
const search = document.querySelector("#search");
const list = document.querySelector("#signal-list");

const issues = [...new Set(signals.map(({ issue }) => issue))].sort();
issues.forEach((issue) => issueFilter.add(new Option(issue, issue)));

function displayDate(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function render() {
  const query = search.value.trim().toLowerCase();
  const filtered = signals.filter((signal) => {
    const haystack = [signal.title, signal.summary, signal.issue, ...signal.lenses].join(" ").toLowerCase();
    return (issueFilter.value === "all" || signal.issue === issueFilter.value)
      && (typeFilter.value === "all" || signal.type === typeFilter.value)
      && haystack.includes(query);
  });
  list.innerHTML = filtered.map((signal) => `
    <article class="signal ${signal.type}">
      <div class="signal-meta"><span>${signal.type}</span><time datetime="${signal.date}">${displayDate(signal.date)}</time></div>
      <div><p class="issue">${signal.issue}</p><h3>${signal.title}</h3><p>${signal.summary}</p>
      <div class="lenses">${signal.lenses.map((lens) => `<span>${lens}</span>`).join("")}</div></div>
      <div class="source"><span class="confidence ${signal.confidence}">${signal.confidence === "review" ? "review required" : `${signal.confidence} confidence`}</span><a href="${signal.sourceUrl}" ${signal.sourceUrl === "#" ? "aria-disabled=\"true\"" : "target=\"_blank\" rel=\"noreferrer\""}>${signal.sourceName} ↗</a></div>
    </article>`).join("") || `<p class="empty">No signals match these filters.</p>`;
  document.querySelector("#signal-count").textContent = filtered.length;
  document.querySelector("#issue-count").textContent = new Set(filtered.map(({ issue }) => issue)).size;
  document.querySelector("#review-count").textContent = filtered.filter(({ confidence }) => confidence === "review").length;
}

[issueFilter, typeFilter, search].forEach((control) => control.addEventListener("input", render));
document.querySelector("#updated").textContent = `Starter dataset reviewed ${displayDate("2026-08-28")}`;
render();
