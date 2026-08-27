import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile(new URL("../data/power-data.json", import.meta.url), "utf8"));
const errors = [];
const factionIds = new Set(data.factions.map(({ id }) => id));
const domainIds = new Set(data.domains.map(({ id }) => id));
const sourceIds = new Set(data.sources.map(({ id }) => id));
const metricIds = new Set(data.metrics.map(({ id }) => id));

const duplicateIds = (items) => items.map(({ id }) => id).filter((id, index, ids) => ids.indexOf(id) !== index);
for (const [label, items] of [["faction", data.factions], ["domain", data.domains], ["metric", data.metrics], ["source", data.sources]]) {
  for (const id of duplicateIds(items)) errors.push(`Duplicate ${label} id: ${id}`);
}

for (const metric of data.metrics) {
  if (!domainIds.has(metric.domain)) errors.push(`Metric ${metric.id} uses unknown domain ${metric.domain}`);
  for (const factionId of Object.keys(metric.values)) if (!factionIds.has(factionId)) errors.push(`Metric ${metric.id} uses unknown faction ${factionId}`);
  for (const factionId of factionIds) if (!(factionId in metric.values)) errors.push(`Metric ${metric.id} is missing faction ${factionId}`);
  for (const sourceId of metric.sources) if (!sourceIds.has(sourceId)) errors.push(`Metric ${metric.id} uses unknown source ${sourceId}`);
  if (!metric.caveat) errors.push(`Metric ${metric.id} has no caveat`);
  if (metric.included && Object.values(metric.values).some((value) => value === null || value === undefined)) errors.push(`Default metric ${metric.id} is incomplete`);
}

for (const item of [...data.primaryRaces, ...data.events]) {
  if (!sourceIds.has(item.source)) errors.push(`${item.race || item.title} uses unknown source ${item.source}`);
}

for (const source of data.sources) {
  if (!(source.url.startsWith("https://") || source.url.startsWith("#"))) errors.push(`Source ${source.id} has invalid URL`);
}

const eventPoints = Object.fromEntries([...factionIds].map((factionId) => [factionId, 0]));
const eventSources = new Set();
for (const event of data.events) {
  if (!factionIds.has(event.faction)) errors.push(`Event ${event.title} uses unknown faction ${event.faction}`);
  if (typeof event.points !== "number") errors.push(`Event ${event.title} has no numeric points value`);
  eventPoints[event.faction] = (eventPoints[event.faction] || 0) + event.points;
  if (event.points !== 0) eventSources.add(event.source);
}
const momentumMetric = data.metrics.find(({ id }) => id === "recent_win_points");
if (!momentumMetric) {
  errors.push("Missing recent_win_points metric");
} else {
  for (const factionId of factionIds) if (momentumMetric.values[factionId] !== eventPoints[factionId]) errors.push(`recent_win_points does not match event log for ${factionId}`);
  for (const sourceId of eventSources) if (!momentumMetric.sources.includes(sourceId)) errors.push(`recent_win_points omits event source ${sourceId}`);
  for (const sourceId of momentumMetric.sources) if (!eventSources.has(sourceId)) errors.push(`recent_win_points lists non-scoring source ${sourceId}`);
  if (momentumMetric.included) errors.push("Broad-wing recent_win_points must remain outside the formal-caucus default score");
}

if (!data.meta.editorialAsOf || !data.meta.generatedOn) errors.push("Metadata must separate editorialAsOf and generatedOn");
for (const factionId of factionIds) {
  if (!data.meta.feeds?.fec?.coverageByFaction?.[factionId]) errors.push(`FEC feed has no coverage date for ${factionId}`);
}
const fecCoverageDates = Object.values(data.meta.feeds?.fec?.coverageByFaction || {}).sort();
const sharedFecAsOf = fecCoverageDates[0];
if (sharedFecAsOf && data.meta.feeds.fec.asOf !== sharedFecAsOf) errors.push("FEC feed asOf must use the minimum shared coverage date");
for (const metric of data.metrics.filter(({ domain }) => domain === "money")) {
  if (sharedFecAsOf && metric.asOf !== sharedFecAsOf) errors.push(`Money metric ${metric.id} does not use the shared FEC date`);
}
if (data.domains.reduce((sum, domain) => sum + domain.defaultWeight, 0) !== 100) errors.push("Default domain weights must total 100");

if (!Array.isArray(data.history) || data.history.length === 0) {
  errors.push("At least one dated metric snapshot is required");
} else {
  const historyDates = new Set();
  for (const snapshot of data.history) {
    if (historyDates.has(snapshot.date)) errors.push(`Duplicate history date ${snapshot.date}`);
    historyDates.add(snapshot.date);
    if (!snapshot.editorialAsOf || !snapshot.fecAsOf) errors.push(`History ${snapshot.date} lacks separated feed dates`);
    for (const metricId of metricIds) {
      if (!snapshot.metrics?.[metricId]) errors.push(`History ${snapshot.date} is missing metric ${metricId}`);
    }
  }
}

for (const race of data.financeRaces.filter(({ date }) => date < "2025-01-01")) {
  if (!race.sampleRole?.toLowerCase().includes("historical")) errors.push(`${race.race} needs an explicit historical-sample label`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${data.metrics.length} measures, ${data.primaryRaces.length} races, ${data.events.length} events, and ${data.sources.length} sources.`);
