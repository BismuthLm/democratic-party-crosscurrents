import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const dataUrl = new URL("../data/power-data.json", import.meta.url);
const data = JSON.parse(await readFile(dataUrl, "utf8"));
const apiKey = process.env.FEC_API_KEY || "DEMO_KEY";
const committeeMap = Object.fromEntries(data.factions.map(({ id, pacId }) => [id, pacId]));
const totals = {};
const finiteOrNull = (value) => Number.isFinite(value) ? value : null;

async function fetchTotals(endpoint, committeeId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(endpoint);
    if (response.ok) return response.json();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 2) throw new Error(`FEC request failed for ${committeeId}: ${response.status}`);
    const retryAfter = Number(response.headers.get("retry-after"));
    await delay(Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500 * 2 ** attempt, 30_000));
  }
  throw new Error(`FEC request failed for ${committeeId}`);
}

for (const [factionId, committeeId] of Object.entries(committeeMap)) {
  const endpoint = new URL(`https://api.open.fec.gov/v1/committee/${committeeId}/totals/`);
  endpoint.searchParams.set("api_key", apiKey);
  endpoint.searchParams.set("cycle", "2026");
  const payload = await fetchTotals(endpoint, committeeId);
  if (!payload.results?.[0]) throw new Error(`FEC returned no totals for ${committeeId}`);
  totals[factionId] = payload.results[0];
}

const coverageByFaction = Object.fromEntries(Object.entries(totals).map(([factionId, row]) => [
  factionId,
  typeof row.coverage_end_date === "string" ? row.coverage_end_date.slice(0, 10) : null
]));
if (Object.values(coverageByFaction).some((value) => !value)) throw new Error("FEC totals omitted a coverage end date; refusing to publish an ambiguous refresh");
const sharedFecAsOf = Object.values(coverageByFaction).sort()[0];

const fields = {
  pac_total_receipts: "receipts",
  pac_disbursements: "disbursements",
  individual_contribution_share: "individual_contributions_percent",
  independent_expenditures: "independent_expenditures",
  candidate_contributions: "fed_candidate_committee_contributions",
  cash_on_hand: "last_cash_on_hand_end_period"
};

for (const metric of data.metrics) {
  if (fields[metric.id]) {
    for (const factionId of Object.keys(committeeMap)) metric.values[factionId] = finiteOrNull(totals[factionId][fields[metric.id]]);
  }
  if (metric.id === "pac_receipts_monthly") {
    for (const factionId of Object.keys(committeeMap)) {
      const row = totals[factionId];
      const start = row.coverage_start_date ? new Date(row.coverage_start_date) : null;
      const end = row.coverage_end_date ? new Date(row.coverage_end_date) : null;
      if (!Number.isFinite(row.receipts) || !start || !end || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
        metric.values[factionId] = null;
      } else {
        const months = Math.max(1, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth() + 1);
        metric.values[factionId] = row.receipts / months;
      }
    }
  }
  if (metric.id === "unitemized_individual_share") {
    for (const factionId of Object.keys(committeeMap)) {
      const row = totals[factionId];
      metric.values[factionId] = Number.isFinite(row.individual_contributions) && row.individual_contributions > 0 && Number.isFinite(row.individual_unitemized_contributions)
        ? row.individual_unitemized_contributions / row.individual_contributions * 100
        : null;
    }
  }
  if (metric.id === "receipts_per_member") {
    for (const faction of data.factions) metric.values[faction.id] = Number.isFinite(totals[faction.id].receipts) && Number.isFinite(faction.membersPublished) && faction.membersPublished > 0
      ? totals[faction.id].receipts / faction.membersPublished
      : null;
  }
  if (metric.domain === "money") {
    metric.asOf = sharedFecAsOf;
  }
}

const generatedOn = new Date().toISOString().slice(0, 10);
data.meta.generatedOn = generatedOn;
data.meta.feeds ??= {};
data.meta.feeds.fec = {
  ...data.meta.feeds.fec,
  label: data.meta.feeds.fec?.label || "Affiliated PAC finance",
  asOf: sharedFecAsOf,
  updateMode: "Weekly automated refresh",
  coverageByFaction
};

const snapshot = {
  date: generatedOn,
  label: "Automated FEC refresh",
  editorialAsOf: data.meta.editorialAsOf,
  fecAsOf: sharedFecAsOf,
  metrics: Object.fromEntries(data.metrics.map((metric) => [metric.id, { ...metric.values }]))
};
data.history ??= [];
const existingSnapshot = data.history.findIndex(({ date }) => date === generatedOn);
if (existingSnapshot >= 0) {
  snapshot.label = data.history[existingSnapshot].label || snapshot.label;
  data.history[existingSnapshot] = snapshot;
} else {
  data.history.push(snapshot);
}
data.history.sort((left, right) => left.date.localeCompare(right.date));

await writeFile(dataUrl, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Refreshed FEC totals through the shared ${sharedFecAsOf} filing date (${JSON.stringify(coverageByFaction)}).`);
