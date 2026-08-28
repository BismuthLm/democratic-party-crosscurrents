import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { computeReleaseIdentity } from "./lib/release.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = join(root, "public");
const errors = [];
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const hashFile = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const fail = (condition, message) => { if (!condition) errors.push(message); };
const duplicateIds = (records) => records.map((record) => record.id).filter((id, index, ids) => ids.indexOf(id) !== index);

const latestPath = join(publicRoot, "data/v3/latest.json");
const latest = await readJson(latestPath);
const [core, sourceLegacy, fecSources] = await Promise.all([readJson(join(root, "data/v3/core.json")), readJson(join(root, "data/power-data.json")), readJson(join(root, "data/v3/fec-sources.json"))]);
const expectedRelease = await computeReleaseIdentity({ root, core, legacy: sourceLegacy, fecSources });
fail(latest.releaseId === expectedRelease.releaseId, `latest.json points to stale release ${latest.releaseId}; current canonical inputs require ${expectedRelease.releaseId}`);
const manifestPath = join(publicRoot, latest.manifest);
const manifest = await readJson(manifestPath);
fail(await hashFile(manifestPath) === latest.manifestSha256, "latest.json manifest hash does not match manifest.json");
fail(latest.releaseId === manifest.releaseId, "latest and manifest release IDs differ");
fail(manifest.schemaVersion === "3.0.0", "Unexpected v3 schema version");
fail(manifest.methodVersion === "balanced-core-v1", "Unexpected model method version");
fail(manifest.immutable === true, "Release manifest must be immutable");

const loaded = new Map();
for (const partition of manifest.partitions) {
  fail(!partition.path.startsWith("/"), `Partition path must be base-aware and relative: ${partition.path}`);
  const path = join(publicRoot, partition.path);
  const payload = await readJson(path);
  loaded.set(partition.path.split("/").slice(-2).join("/"), payload);
  const fileStats = await stat(path);
  fail(fileStats.size === partition.bytes, `Byte count mismatch for ${partition.path}`);
  fail(await hashFile(path) === partition.sha256, `SHA-256 mismatch for ${partition.path}`);
  fail((Array.isArray(payload) ? payload.length : 1) === partition.rowCount, `Row count mismatch for ${partition.path}`);
}
for (const artifact of manifest.downloads) {
  fail(!artifact.path.startsWith("/"), `Download path must be base-aware and relative: ${artifact.path}`);
  const path = join(publicRoot, artifact.path);
  const fileStats = await stat(path);
  fail(fileStats.size === artifact.bytes, `Byte count mismatch for ${artifact.path}`);
  fail(await hashFile(path) === artifact.sha256, `SHA-256 mismatch for ${artifact.path}`);
}

const organizations = loaded.get("entities/organizations.json");
const camps = loaded.get("entities/camps.json");
const people = loaded.get("entities/people.json");
const relationships = loaded.get("facts/relationships.json");
const campDerivations = loaded.get("facts/camp-derivations.json");
const contests = loaded.get("facts/contests.json");
const candidacies = loaded.get("facts/candidacies.json");
const electionResults = loaded.get("facts/election-results.json");
const sourceObservations = loaded.get("facts/source-observations.json");
const metricDefinitions = loaded.get("metrics/definitions.json");
const metricObservations = loaded.get("metrics/observations.json");
const modelBundle = loaded.get("metrics/balanced-core-v1.json");
const sources = loaded.get("sources/sources.json");
const documents = loaded.get("sources/documents.json");
const evidence = loaded.get("sources/evidence.json");
const quality = loaded.get("quality/coverage.json");
const legacy = loaded.get("context/legacy-v2.1.json");

for (const [label, records] of Object.entries({ organizations, camps, people, relationships, campDerivations, contests, candidacies, electionResults, sourceObservations, metricDefinitions, metricObservations, sources, documents, evidence })) {
  for (const id of duplicateIds(records)) errors.push(`Duplicate ${label} ID: ${id}`);
}
const organizationIds = new Set(organizations.map((record) => record.id));
const campIds = new Set(camps.map((record) => record.id));
const personIds = new Set(people.map((record) => record.id));
const contestIds = new Set(contests.map((record) => record.id));
const candidacyIds = new Set(candidacies.map((record) => record.id));
const sourceObservationIds = new Set(sourceObservations.map((record) => record.id));
const metricIds = new Set(metricDefinitions.map((record) => record.id));
const sourceIds = new Set(sources.map((record) => record.id));
const documentIds = new Set(documents.map((record) => record.id));

for (const relationship of relationships) {
  fail(personIds.has(relationship.personId), `${relationship.id} uses unknown person ${relationship.personId}`);
  fail(organizationIds.has(relationship.organizationId), `${relationship.id} uses unknown organization ${relationship.organizationId}`);
  fail(["A", "B", "C", "D"].includes(relationship.evidenceGrade), `${relationship.id} has invalid evidence grade`);
  if (relationship.validFrom && relationship.validTo) fail(relationship.validFrom < relationship.validTo, `${relationship.id} has an empty or reversed validity interval`);
  fail(Boolean(relationship.observedAt && relationship.reviewer && relationship.reviewStatus && relationship.rationale && relationship.locator), `${relationship.id} lacks required temporal or review provenance`);
}
const relationshipSpells = new Map();
for (const relationship of relationships.filter((record) => record.validFrom)) {
  const grain = [relationship.personId, relationship.organizationId, relationship.type, relationship.role ?? "", relationship.program ?? "", relationship.cycle ?? ""].join(":");
  if (!relationshipSpells.has(grain)) relationshipSpells.set(grain, []);
  relationshipSpells.get(grain).push(relationship);
}
for (const [grain, spells] of relationshipSpells) {
  const ordered = spells.sort((left, right) => left.validFrom.localeCompare(right.validFrom));
  for (let index = 1; index < ordered.length; index += 1) fail((ordered[index - 1].validTo ?? "9999-12-31") <= ordered[index].validFrom, `Overlapping relationship spells at ${grain}: ${ordered[index - 1].id} and ${ordered[index].id}`);
}
for (const derived of campDerivations) {
  fail(personIds.has(derived.personId), `${derived.id} uses unknown person`);
  fail(campIds.has(derived.campId), `${derived.id} uses unknown camp`);
  fail(derived.evidenceGrade === "C", `${derived.id} must be grade C`);
  fail(derived.evidenceWeight === 1 || derived.evidenceWeight === 0.8, `${derived.id} must inherit an A/B weight`);
  fail(Array.isArray(derived.sourceRelationshipIds) && derived.sourceRelationshipIds.every((id) => relationships.some((record) => record.id === id)), `${derived.id} lacks resolvable triggering relationships`);
}
for (const contest of contests) {
  fail(sourceIds.has(contest.sourceId), `${contest.id} uses unknown source`);
  fail(contest.denominatorComplete === true, `${contest.id} from complete official workbooks is not denominator-complete`);
}
fail(contests.every((contest) => contest.primaryDate ? contest.electionDate === contest.primaryDate : contest.dateStatus === "undated_review_required"), "Contest dates must resolve to an official date or an explicit review-required status");
for (const candidacy of candidacies) {
  fail(contestIds.has(candidacy.contestId), `${candidacy.id} uses unknown contest`);
  fail(personIds.has(candidacy.personId), `${candidacy.id} uses unknown person`);
  fail(Array.isArray(candidacy.sourceRows) && candidacy.sourceRows.length > 0, `${candidacy.id} has no raw row locator`);
  fail(candidacy.fecCandidateId === null || /^[HSP]\d[A-Z]{2}\d{5}$/.test(candidacy.fecCandidateId), `${candidacy.id} has a placeholder or malformed FEC candidate ID`);
  if (candidacy.identityStatus === "unresolved_fec_candidate_id") fail(candidacy.fecCandidateId === null, `${candidacy.id} exposes a placeholder as a stable FEC ID`);
  fail(candidacy.primaryWinner === null, `${candidacy.id} publishes a nomination winner before contest-system review`);
  fail(candidacy.sourceObservationIds.every((id) => sourceObservationIds.has(id)), `${candidacy.id} has unresolved source observations`);
}
const unresolvedPeople = people.filter((person) => person.identityStatus === "unresolved_fec_candidate_id");
fail(unresolvedPeople.every((person) => person.fecCandidateId === null && person.identityReason), "Unresolved people must retain a reason and a null FEC ID");
fail(quality.counts.unresolvedIdentities === unresolvedPeople.length, "Unresolved identity count differs from the published quality summary");
const conflictingCandidacies = candidacies.filter((candidacy) => candidacy.identityStatus === "conflicting_fec_candidate_id");
fail(conflictingCandidacies.every((candidacy) => candidacy.identityReason), "Conflicting identifier rows must retain a review reason");
fail(quality.counts.conflictingIdentityRows === conflictingCandidacies.length, "Conflicting identity count differs from the published quality summary");
const importedSourceRows = sourceObservations.length;
const eligibleSourceRows = quality.coverage.filter((record) => record.denominatorEligible).reduce((sum, record) => sum + record.eligibleDemocraticPrimaryRows, 0);
fail(importedSourceRows === eligibleSourceRows, `Source observations ${importedSourceRows} do not reconcile to ${eligibleSourceRows} eligible official rows`);
for (const observation of sourceObservations) {
  fail(contestIds.has(observation.contestId), `${observation.id} uses unknown contest`);
  fail(sourceIds.has(observation.sourceId) && documentIds.has(observation.documentId), `${observation.id} has unresolved provenance`);
  if (observation.rowRole === "write_in_aggregate") fail(observation.canonicalCandidacyId === null, `${observation.id} creates a fictitious write-in person or candidacy`);
  else fail(candidacyIds.has(observation.canonicalCandidacyId), `${observation.id} has no canonical candidacy`);
}
fail(!people.some((person) => /^(scattered|write[ -]?ins?)$/i.test(person.name)), "Write-in aggregates became people");
for (const result of electionResults) {
  fail(contestIds.has(result.contestId), `${result.id} uses unknown contest`);
  fail(candidacyIds.has(result.candidacyId), `${result.id} uses unknown candidacy`);
  fail(personIds.has(result.personId), `${result.id} uses unknown person`);
  fail(sourceIds.has(result.sourceId) && documentIds.has(result.documentId), `${result.id} has unresolved source provenance`);
  fail(result.votes !== undefined && result.votesRaw !== undefined && result.share !== undefined, `${result.id} omits required nullable result fields`);
  if (result.share !== null) fail(result.share >= 0 && result.share <= 100, `${result.id} has an invalid percentage`);
  fail(result.winner === null && result.winnerBasis === "not_inferred_without_reviewed_contest_system", `${result.id} overstates a nomination winner`);
  fail(result.sourceObservationIds.every((id) => sourceObservationIds.has(id)), `${result.id} has unresolved source-observation lineage`);
  if (["#", "W#"].includes(result.markerRaw)) fail(result.outcomeStatus.includes("footnote"), `${result.id} converts a footnoted marker into an unqualified outcome`);
}
for (const fecCandidateId of ["H8IL06147", "H2MD02160", "H2NY04269", "H2MN01207"]) {
  const records = candidacies.filter((candidacy) => candidacy.fecCandidateId === fecCandidateId);
  fail(records.length >= 2 && new Set(records.map((record) => record.personId)).size >= 2 && records.every((record) => record.identityStatus === "conflicting_fec_candidate_id"), `Known bad FEC ID was not split and flagged: ${fecCandidateId}`);
}
for (const observation of metricObservations) {
  fail(metricIds.has(observation.metricId), `${observation.id} uses unknown metric`);
  fail(campIds.has(observation.campId), `${observation.id} uses unknown camp`);
  fail(observation.value === null || Number.isFinite(observation.value), `${observation.id} has a nonfinite value`);
  fail(observation.value !== undefined, `${observation.id} omits required nullable value`);
  fail(observation.denominator !== 0 || observation.value === null, `${observation.id} converts a zero denominator into a rate`);
  fail(observation.sourceIds.every((id) => sourceIds.has(id)), `${observation.id} uses unknown source`);
}
for (const record of sources) {
  fail(record.canonicalUrl.startsWith("https://") || record.canonicalUrl.startsWith("#"), `${record.id} has an invalid canonical URL`);
  fail(Boolean(record.license), `${record.id} has no reuse note`);
}
for (const record of documents) fail(sourceIds.has(record.sourceId), `${record.id} uses unknown source`);
for (const record of evidence) {
  if (record.sourceId) fail(sourceIds.has(record.sourceId), `${record.id} uses unknown source`);
  if (record.documentId) fail(documentIds.has(record.documentId), `${record.id} uses unknown document`);
  fail(["A", "B", "C", "D"].includes(record.evidenceGrade), `${record.id} has invalid evidence grade`);
  fail(Boolean(record.rationale && record.locator), `${record.id} lacks rationale or locator`);
}

for (const cycle of [2018, 2020, 2022]) {
  const coverage = quality.coverage.find((record) => record.cycle === cycle);
  fail(Boolean(coverage), `Missing ${cycle} coverage record`);
  fail(coverage?.denominatorEligible === true && coverage?.status === "complete_official_workbook", `${cycle} must be eligible and complete`);
  fail(coverage?.importRate === 1 && coverage?.eligibleDemocraticPrimaryRows === coverage?.importedRows, `${cycle} official Democratic primary import is not 100%`);
}
for (const cycle of [2024, 2026]) {
  const coverage = quality.coverage.find((record) => record.cycle === cycle);
  fail(coverage?.denominatorEligible === false && Boolean(coverage?.reason), `${cycle} incomplete coverage must be excluded with a reason`);
}
fail(quality.counts.legacySourcesMigrated === 57, "Legacy source migration lost records");
fail(quality.counts.legacyMeasuresMigrated === 22, "Legacy measure migration lost records");
fail(quality.counts.legacyPrimaryRacesMigrated === 12, "Legacy race migration lost records");
fail(quality.counts.legacyFinanceCasesMigrated === 6, "Legacy finance migration lost records");
fail(quality.counts.legacyOpinionRecordsMigrated === 6, "Legacy opinion migration lost records");
fail(quality.counts.legacyEventsMigrated === 13, "Legacy event migration lost records");
fail(quality.counts.legacySnapshotsMigrated === 1, "Legacy snapshot migration lost records");
fail(legacy.schema === "power-data-v2.1", "Legacy archive schema label is missing");

const expectedCamps = new Map([
  ["sarah_mcbride", ["cpc_aligned", "new_dem_aligned"]],
  ["adam_gray", ["party_network", "new_dem_aligned", "blue_dog_aligned"]],
  ["alexandria_ocasio_cortez", ["movement_left_network", "cpc_aligned"]],
  ["derek_tran", ["party_network", "new_dem_aligned"]],
  ["kirsten_engel", []],
]);
for (const [personId, expected] of expectedCamps) {
  const actual = people.find((person) => person.id === personId)?.currentCampIds ?? [];
  fail(JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort()), `${personId} taxonomy regression failed: ${actual.join(", ")}`);
}
const aocNational = relationships.find((record) => record.id === "rel_aoc_dsa_national_2024");
const aocLocal = relationships.find((record) => record.id === "rel_aoc_nyc_dsa_2024");
fail(aocNational?.validTo === "2024-07-10" && Boolean(aocLocal), "AOC national withdrawal/local chapter regression failed");
const engelCamps = campDerivations.filter((record) => record.personId === "kirsten_engel");
fail(engelCamps.every((record) => record.campId === "party_network" && [2022, 2024].includes(record.cycle)), "DCCC Red to Blue inferred an ideological camp for Kirsten Engel");

const configuredMeasures = new Set(modelBundle.model.domains.flatMap((domain) => domain.measures.map((measure) => measure.id)));
fail(!configuredMeasures.has("source_coverage") && !configuredMeasures.has("recent_win_points"), "Source coverage or editorial event points entered balanced-core");
fail(modelBundle.referenceDistribution?.acceptanceEligible === false, "Provisional reference distribution must not be marked acceptance-eligible");
fail(modelBundle.referenceDistribution?.status === "provisional_not_longitudinally_complete", "Reference-distribution methodology gap is not disclosed");
fail(quality.reviewQueue.some((record) => record.id === "gap-reference-distribution" && record.status === "review_required"), "Reference-distribution methodology gap is missing from the public review queue");
fail(Math.abs(modelBundle.model.domains.reduce((sum, domain) => sum + domain.weight, 0) - 1) < 1e-12, "Balanced-core domain weights do not total 1");
for (const score of modelBundle.scores) {
  if (["movement_left_network", "party_network"].includes(score.campId)) fail(score.score === null && score.sufficient === false, `${score.campId} should report insufficient coverage`);
  if (["cpc_aligned", "new_dem_aligned", "blue_dog_aligned"].includes(score.campId)) fail(Number.isFinite(score.score) && score.sufficient === true, `${score.campId} should have complete balanced-core inputs`);
  fail(score.domainScores.every((domain) => domain.coverage >= 0 && domain.coverage <= 1), `${score.campId} has invalid domain coverage`);
}

const monthlyReceipts = metricObservations.find((record) => record.metricId === "pac_receipts_monthly" && record.campId === "new_dem_aligned");
const independentSpend = metricObservations.find((record) => record.metricId === "independent_expenditures" && record.campId === "new_dem_aligned");
const freshman = metricObservations.find((record) => record.metricId === "freshman_119" && record.campId === "blue_dog_aligned");
fail(Number.isFinite(monthlyReceipts?.value), "Populated finance amount became missing");
fail(independentSpend?.value === 0, "Reported finance zero was not preserved");
fail(freshman?.value === null, "Missing legacy value was not preserved as null");

const sqlitePath = join(publicRoot, manifest.downloads.find((artifact) => artifact.path.endsWith(".sqlite")).path);
const db = new DatabaseSync(sqlitePath, { readOnly: true });
const integrity = db.prepare("PRAGMA integrity_check").all();
const foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
fail(integrity.length === 1 && integrity[0].integrity_check === "ok", "SQLite integrity_check failed");
fail(foreignKeys.length === 0, "SQLite foreign_key_check failed");
fail(db.prepare("PRAGMA user_version").get().user_version === 3, "SQLite user_version is not 3");
fail(db.prepare("SELECT COUNT(*) AS count FROM candidacies").get().count === candidacies.length, "SQLite candidacy count differs from JSON");
fail(db.prepare("SELECT COUNT(*) AS count FROM election_results").get().count === electionResults.length, "SQLite result count differs from JSON");
fail(db.prepare("SELECT COUNT(*) AS count FROM source_observations").get().count === sourceObservations.length, "SQLite source-observation count differs from JSON");
fail(db.prepare("SELECT COUNT(*) AS count FROM candidacies WHERE primary_winner IS NULL").get().count === candidacies.filter((record) => record.primaryWinner === null).length, "SQLite coerced nullable primary-winner values");
db.close();

const zipPath = join(publicRoot, manifest.downloads.find((artifact) => artifact.path.endsWith(".zip")).path);
try { execFileSync("unzip", ["-tqq", zipPath], { stdio: "pipe" }); } catch { errors.push("Core CSV archive failed unzip integrity test"); }

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${manifest.releaseId}: ${sourceObservations.length} official source rows, ${people.length} people, ${candidacies.length} candidacies, ${electionResults.length} canonical results, ${sources.length} sources, ${evidence.length} evidence links, SQLite and CSV artifacts.`);
