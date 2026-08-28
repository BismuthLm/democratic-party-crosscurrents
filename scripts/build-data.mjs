import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { calculateBalancedModel, jeffreysRate } from "./lib/model.mjs";
import { computeReleaseIdentity } from "./lib/release.mjs";
import { deriveCampRelationships } from "./lib/taxonomy.mjs";
import { openWorkbook } from "./lib/xlsx.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");
const publicRoot = join(root, "public");
const core = JSON.parse(await readFile(join(root, "data/v3/core.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(root, "data/power-data.json"), "utf8"));
const fecSources = JSON.parse(await readFile(join(root, "data/v3/fec-sources.json"), "utf8"));

const { releaseId, generatedOn } = await computeReleaseIdentity({ root, core, legacy, fecSources });
const finalReleaseRoot = join(publicRoot, "data/v3/releases", releaseId);
const finalDownloadsRoot = join(publicRoot, "downloads", releaseId);
const releaseRoot = `${finalReleaseRoot}.building`;
const downloadsRoot = `${finalDownloadsRoot}.building`;
let existingBuildCommit = null;
try {
  const existingManifest = JSON.parse(await readFile(join(finalReleaseRoot, "manifest.json"), "utf8"));
  if (existingManifest.releaseId === releaseId && typeof existingManifest.buildCommit === "string") existingBuildCommit = existingManifest.buildCommit;
} catch {
  // A new content-addressed release has no prior manifest to preserve.
}

const slug = (value) => String(value ?? "unknown")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "") || "unknown";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const shortHash = (value) => sha256(value).slice(0, 12);
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const finiteOrNull = (value) => Number.isFinite(value) ? value : null;
const textOrNull = (value) => value === null || value === undefined || String(value).trim() === "" ? null : String(value).trim();
const isoInstant = (date) => date ? `${date}T12:00:00Z` : null;
const normalizeFecCandidateId = (value) => {
  const candidateId = textOrNull(value)?.toUpperCase() ?? null;
  return candidateId && /^[HSP]\d[A-Z]{2}\d{5}$/.test(candidateId) ? candidateId : null;
};
const nameTokens = (value) => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter((token) => token && token.length > 1 && !["jr", "sr", "ii", "iii", "iv"].includes(token));
const namesCompatible = (left, right) => {
  const leftTokens = new Set(nameTokens(left)); const rightTokens = new Set(nameTokens(right));
  if (!leftTokens.size || !rightTokens.size) return false;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token));
  return shared.length >= Math.min(leftTokens.size, rightTokens.size) && shared.length >= 2;
};

async function hashFile(path) {
  return sha256(await readFile(path));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, jsonText(value));
}

async function pathExists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function directoryInventory(rootPath, prefix = "") {
  const inventory = [];
  for (const entry of await readdir(rootPath, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = join(rootPath, entry.name);
    if (entry.isDirectory()) inventory.push(...await directoryInventory(absolutePath, relativePath));
    else inventory.push(`${relativePath}:${(await stat(absolutePath)).size}:${await hashFile(absolutePath)}`);
  }
  return inventory.sort();
}

function cellResult(value, percentage) {
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : null;
  const rawValue = value === null || value === undefined ? null : String(value);
  const numericPercentage = typeof percentage === "number" && Number.isFinite(percentage) ? percentage : null;
  return {
    votes: numericValue,
    votesRaw: rawValue,
    share: numericPercentage === null ? null : numericPercentage <= 1 ? numericPercentage * 100 : numericPercentage,
    shareRaw: percentage === null || percentage === undefined ? null : String(percentage),
    hasObservation: numericValue !== null || rawValue !== null || numericPercentage !== null,
  };
}

function isDemocraticParty(value) {
  const raw = String(value ?? "").toUpperCase().trim();
  const party = raw.replace(/[^A-Z0-9]+/g, " ").trim();
  return raw === "D"
    || raw.startsWith("D/")
    || raw.includes("(D)")
    || /(^| )(DEM|DEMOCRAT|DEMOCRATIC|DFL|DNL|D NPL|DEM NPL)( |$)/.test(party)
    || party.startsWith("DEM");
}

function chamberFromDistrict(value, sheetName) {
  const district = String(value ?? "").toUpperCase().trim();
  if (district.startsWith("S") || /SENATE/i.test(sheetName)) return "Senate";
  return "House";
}

function normalizeDistrict(value, chamber) {
  if (chamber === "Senate") return "S";
  const district = String(value ?? "").trim();
  if (!district || district === "0" || district === "00") return "AL";
  const numeric = Number(district);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, "0") : district.toUpperCase();
}

function classifyFecMarker(value, workbookCycle) {
  const markerRaw = textOrNull(value)?.toUpperCase() ?? null;
  if (!markerRaw) return { markerRaw: null, outcomeStatus: "no_marker", advanced: null, partySelected: null };
  if (workbookCycle === 2018) return { markerRaw, outcomeStatus: "general_election_marker_not_primary", advanced: null, partySelected: null };
  if (markerRaw === "W") return { markerRaw, outcomeStatus: "primary_advancement_marker", advanced: true, partySelected: null };
  if (markerRaw === "*") return { markerRaw, outcomeStatus: "party_endorsement_or_convention_marker", advanced: null, partySelected: true };
  if (markerRaw === "W#") return { markerRaw, outcomeStatus: "advancement_marker_with_footnote", advanced: true, partySelected: null };
  return { markerRaw, outcomeStatus: "footnote_review_required", advanced: null, partySelected: null };
}

function campIsCurrent(derived) {
  if (derived.cycle && derived.cycle !== 2026) return false;
  if (derived.validFrom && derived.validFrom > core.reviewedThrough) return false;
  if (derived.validTo && derived.validTo <= core.reviewedThrough) return false;
  if (!derived.validFrom && derived.observedAt && derived.observedAt.slice(0, 10) < "2026-01-01" && !derived.cycle) return false;
  return derived.evidenceWeight > 0;
}

function parseElectionDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000).toISOString().slice(0, 10);
  const match = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(value ?? ""));
  if (!match) return null;
  const [, monthText, dayText, yearText] = match;
  const year = Number(yearText); const month = Number(monthText); const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : null;
}

function buildRegularDateLookup(workbook, cycle) {
  const config = {
    2018: { sheet: "2018 Primary Dates", state: 0, indicator: 1, primary: 2, runoff: 3 },
    2020: { sheet: "15. 2020 Primary Dates", state: 4, indicator: 5, primary: 6, runoff: 7 },
    2022: { sheet: "10. 2022 Primary Dates", state: 0, indicator: 1, primary: 2, runoff: 3 },
  }[cycle];
  const lookup = new Map();
  if (!config || !workbook.sheetNames.includes(config.sheet)) return lookup;
  for (const row of workbook.readSheet(config.sheet, 20)) {
    const stateName = textOrNull(row.values[config.state]);
    const rawPrimary = row.values[config.primary];
    const primaryDate = parseElectionDate(rawPrimary);
    if (!stateName || !primaryDate || /^(state|note)/i.test(stateName)) continue;
    const annotation = String(rawPrimary ?? "");
    const chamber = /u\.s\.\s*house/i.test(annotation) ? "House" : /u\.s\.\s*senate/i.test(annotation) ? "Senate" : "all";
    lookup.set(`${stateName.toLowerCase()}:${chamber}`, { primaryDate, runoffDate: parseElectionDate(row.values[config.runoff]), rawPrimaryDate: rawPrimary ?? null, rawRunoffDate: row.values[config.runoff] ?? null, sourceSheet: config.sheet, sourceRow: row.rowNumber });
  }
  return lookup;
}

function datesFromSpecialFootnote(values) {
  const footnote = values.slice(23).filter((value) => value !== null && value !== undefined).join(" ");
  const labeled = (label) => parseElectionDate(new RegExp(`${label}[^0-9]*(\\d{1,2}\\/\\d{1,2}\\/\\d{4})`, "i").exec(footnote)?.[1] ?? null);
  return {
    primaryDate: labeled("special primary election") ?? labeled("democratic party convention"),
    runoffDate: labeled("special runoff election"),
    generalDate: labeled("special general election"),
    footnote: footnote || null,
  };
}

function buildSpecialDateLookup(rows) {
  const lookup = new Map();
  let block = [];
  let blockKey = null;
  const flush = () => {
    if (!block.length) return;
    const unique = (field) => [...new Set(block.map((item) => item.dates[field]).filter(Boolean))];
    const primaryDates = unique("primaryDate"); const runoffDates = unique("runoffDate"); const generalDates = unique("generalDate");
    for (const item of block) lookup.set(item.rowNumber, {
      ...item.dates,
      primaryDate: item.dates.primaryDate ?? (primaryDates.length === 1 ? primaryDates[0] : null),
      runoffDate: item.dates.runoffDate ?? (runoffDates.length === 1 ? runoffDates[0] : null),
      generalDate: item.dates.generalDate ?? (generalDates.length === 1 ? generalDates[0] : null),
      blockPropagated: !item.dates.primaryDate && primaryDates.length === 1,
    });
    block = []; blockKey = null;
  };
  for (const row of rows.slice(1)) {
    const state = textOrNull(row.values[1]); const district = textOrNull(row.values[3]);
    const key = state && district ? `${state}:${district}` : null;
    if (!key || (blockKey && key !== blockKey)) flush();
    if (!key) continue;
    blockKey = key;
    block.push({ rowNumber: row.rowNumber, dates: datesFromSpecialFootnote(row.values) });
  }
  flush();
  return lookup;
}

async function ingestFec() {
  const peopleById = new Map(core.people.map((person) => [person.id, { ...person, source: "reviewed_core", identityStatus: "reviewed_crosswalk", identityReason: null }]));
  const identitiesByFecId = new Map(core.people.filter((person) => person.fecCandidateId).map((person) => [person.fecCandidateId, [{ personId: person.id, name: person.name, source: "reviewed_core" }]]));
  const conflictingFecIds = new Set();
  const contestsById = new Map();
  const candidaciesById = new Map();
  const resultsById = new Map();
  const sourceObservations = [];
  const evidence = [];
  const coverage = [];
  const upsertResult = (record, priority) => {
    const existing = resultsById.get(record.id);
    if (!existing) { resultsById.set(record.id, { ...record, activePriority: priority, sourceObservationIds: [record.sourceObservationId], sourceRows: [{ cycle: record.sourceCycle, sheet: record.sourceSheet, row: record.sourceRow }] }); return; }
    const sourceObservationIds = [...new Set([...existing.sourceObservationIds, record.sourceObservationId])];
    const sourceRows = [...existing.sourceRows, { cycle: record.sourceCycle, sheet: record.sourceSheet, row: record.sourceRow }];
    if (priority > existing.activePriority) resultsById.set(record.id, { ...record, activePriority: priority, sourceObservationIds, sourceRows });
    else { existing.sourceObservationIds = sourceObservationIds; existing.sourceRows = sourceRows; }
  };

  for (const source of fecSources) {
    const workbookPath = join(root, source.localPath);
    const observedHash = await hashFile(workbookPath);
    if (observedHash !== source.sha256) throw new Error(`FEC workbook hash mismatch for ${source.cycle}: expected ${source.sha256}, received ${observedHash}`);
    const workbook = openWorkbook(workbookPath);
    const regularDateLookup = buildRegularDateLookup(workbook, source.cycle);
    const missingSheets = source.sheets.filter((name) => !workbook.sheetNames.includes(name));
    if (missingSheets.length) throw new Error(`FEC ${source.cycle} workbook is missing sheets: ${missingSheets.join(", ")}`);
    let eligibleRows = 0;
    let importedRows = 0;
    const sheetCounts = [];

    for (const sheetName of source.sheets) {
      const rows = workbook.readSheet(sheetName, 40);
      const specialDateLookup = /special|new election/i.test(sheetName) ? buildSpecialDateLookup(rows) : new Map();
      let sheetEligible = 0;
      let sheetImported = 0;
      const special = /special|new election/i.test(sheetName);
      for (const row of rows.slice(1)) {
        const values = row.values;
        const stateAbbr = textOrNull(values[1]);
        const stateName = textOrNull(values[2]);
        const districtRaw = textOrNull(values[3]);
        const fecCandidateIdRaw = textOrNull(values[4]);
        const fecCandidateId = normalizeFecCandidateId(fecCandidateIdRaw);
        const incumbent = textOrNull(values[5]);
        const firstName = textOrNull(values[6]);
        const lastName = textOrNull(values[7]);
        const displayName = textOrNull(values[8]) ?? ([firstName, lastName].filter(Boolean).join(" ") || null);
        const summaryLabel = textOrNull(values[9]);
        const party = textOrNull(values[10]);
        const primary = cellResult(values[11], values[12]);
        const runoff = cellResult(values[13], values[14]);
        const hasPrimary = primary.hasObservation || runoff.hasObservation;
        const looksLikeCandidate = Boolean(displayName && party && !summaryLabel?.match(/(?:party|district|state) votes/i));
        if (!looksLikeCandidate || !isDemocraticParty(party) || !hasPrimary) continue;
        eligibleRows += 1;
        sheetEligible += 1;

        const chamber = chamberFromDistrict(districtRaw, sheetName);
        const district = normalizeDistrict(districtRaw, chamber);
        const termClass = String(districtRaw ?? "").toUpperCase().includes("UNEXPIRED") ? "unexpired" : "full";
        const regularDates = regularDateLookup.get(`${String(stateName).toLowerCase()}:${chamber}`) ?? regularDateLookup.get(`${String(stateName).toLowerCase()}:all`) ?? null;
        const specialDates = specialDateLookup.get(row.rowNumber) ?? null;
        const primaryDate = /2019 nc 09 new election/i.test(sheetName) ? "2019-05-14" : special ? specialDates?.primaryDate ?? null : regularDates?.primaryDate ?? null;
        const runoffDate = special ? specialDates?.runoffDate ?? null : regularDates?.runoffDate ?? null;
        const generalDate = /2019 nc 09 new election/i.test(sheetName) ? "2019-09-10" : special ? specialDates?.generalDate ?? null : null;
        const eventYear = Number((primaryDate ?? runoffDate ?? generalDate ?? `${source.cycle}`).slice(0, 4));
        const dateKey = special ? primaryDate ?? runoffDate ?? generalDate ?? `undated-${source.cycle}-${slug(sheetName)}` : String(source.cycle);
        const contestId = special
          ? `fec-special-${slug(stateAbbr)}-${chamber.toLowerCase()}-${slug(district)}-${termClass}-${dateKey}`
          : `fec-${source.cycle}-${slug(stateAbbr)}-${chamber.toLowerCase()}-${slug(district)}-${termClass}`;
        if (!contestsById.has(contestId)) contestsById.set(contestId, {
          id: contestId,
          cycle: source.cycle,
          sourceCycles: [source.cycle],
          eventYear,
          electionDate: primaryDate,
          primaryDate,
          runoffDate,
          generalDate,
          dateStatus: primaryDate ? specialDates?.blockPropagated ? "block_propagated_from_official_footnote" : "official_compilation_date" : "undated_review_required",
          chamber,
          state: stateAbbr,
          stateName,
          district,
          termClass,
          special,
          stageUniverse: "Democratic primary and runoff",
          certificationStatus: "official_fec_compilation",
          denominatorComplete: true,
          sourceId: `fec-results-${source.cycle}`,
          sourceIds: [`fec-results-${source.cycle}`],
          sourceSheet: sheetName,
        });
        else {
          const contest = contestsById.get(contestId);
          contest.sourceCycles = [...new Set([...contest.sourceCycles, source.cycle])];
          contest.sourceIds = [...new Set([...contest.sourceIds, `fec-results-${source.cycle}`])];
          contest.primaryDate ??= primaryDate; contest.runoffDate ??= runoffDate; contest.generalDate ??= generalDate; contest.electionDate ??= primaryDate;
        }

        const marker = classifyFecMarker(values[21], source.cycle);
        const rowRole = /^(scattered|write[ -]?ins?)$/i.test(displayName) ? "write_in_aggregate" : /combined/i.test(party) ? "candidate_combined_ballot_line" : "candidate_ballot_line";
        const sourceObservationId = `source-observation-fec-${source.cycle}-${slug(sheetName)}-${row.rowNumber}`;
        const sourceObservation = {
          id: sourceObservationId,
          sourceId: `fec-results-${source.cycle}`,
          documentId: `fec-workbook-${source.cycle}`,
          sourceCycle: source.cycle,
          sourceSheet: sheetName,
          sourceRow: row.rowNumber,
          contestId,
          rowRole,
          state: stateAbbr,
          chamber,
          district,
          eventYear,
          primaryDate,
          runoffDate,
          generalDate,
          candidateNameRaw: displayName,
          fecCandidateIdRaw,
          fecCandidateId,
          partyRaw: party,
          incumbentRaw: incumbent,
          primary,
          runoff,
          ...marker,
          footnote: specialDates?.footnote ?? null,
          observedAt: source.retrievedAt,
          canonicalCandidacyId: null,
        };
        sourceObservations.push(sourceObservation);
        if (rowRole === "write_in_aggregate") {
          evidence.push({ id: `evidence-${sourceObservationId}`, factType: "source_observation", factId: sourceObservationId, sourceId: sourceObservation.sourceId, documentId: sourceObservation.documentId, locator: `${sheetName}, Excel row ${row.rowNumber}`, evidenceGrade: "A", reviewStatus: "automated_official_import", rationale: "Official write-in aggregate preserved as a source observation without creating a fictitious person or candidacy." });
          importedRows += 1; sheetImported += 1;
          continue;
        }

        const rowIdentityId = `fec-row-${source.cycle}-${slug(sheetName)}-${row.rowNumber}-${slug(displayName)}`;
        const knownIdentities = fecCandidateId ? identitiesByFecId.get(fecCandidateId) ?? [] : [];
        const compatibleIdentity = knownIdentities.find((identity) => namesCompatible(identity.name, displayName));
        const identityConflict = Boolean(fecCandidateId && knownIdentities.length && !compatibleIdentity);
        if (identityConflict) conflictingFecIds.add(fecCandidateId);
        const personId = compatibleIdentity?.personId ?? (fecCandidateId && !identityConflict ? `fec-${fecCandidateId.toLowerCase()}` : rowIdentityId);
        const identityStatus = !fecCandidateId ? "unresolved_fec_candidate_id" : identityConflict ? "conflicting_fec_candidate_id" : "official_fec_candidate_id";
        const identityReason = !fecCandidateId
          ? `Official result row has no valid FEC candidate ID${fecCandidateIdRaw ? ` (published value: ${fecCandidateIdRaw})` : ""}; kept row-specific to prevent a false identity merge.`
          : identityConflict
            ? `Official result row reuses ${fecCandidateId} for a name incompatible with another published row; kept row-specific pending review.`
            : null;
        if (!peopleById.has(personId)) peopleById.set(personId, {
          id: personId,
          name: displayName,
          actualParty: "Democratic",
          bioguideId: null,
          fecCandidateId,
          source: "fec_result_compilation",
          identityStatus,
          identityReason,
        });
        if (fecCandidateId && !identityConflict && !compatibleIdentity) identitiesByFecId.set(fecCandidateId, [...knownIdentities, { personId, name: displayName, source: "fec_result_compilation" }]);
        const candidacyId = `candidacy-${contestId}-${personId}`;
        if (!candidaciesById.has(candidacyId)) candidaciesById.set(candidacyId, {
          id: candidacyId,
          contestId,
          personId,
          fecCandidateId,
          fecCandidateIdRaw,
          identityStatus,
          identityReason,
          candidateName: displayName,
          party,
          incumbent: incumbent ? /I/i.test(incumbent) : null,
          ballotStatus: "official_result_row",
          sourceRows: [],
          sourceObservationIds: [],
          ballotLines: [],
        });
        const candidacy = candidaciesById.get(candidacyId);
        candidacy.sourceRows.push({ cycle: source.cycle, sheet: sheetName, row: row.rowNumber });
        candidacy.sourceObservationIds.push(sourceObservationId);
        candidacy.ballotLines.push({ sourceObservationId, party, rowRole });
        sourceObservation.canonicalCandidacyId = candidacyId;

        const base = {
          contestId,
          candidacyId,
          personId,
          sourceId: `fec-results-${source.cycle}`,
          documentId: `fec-workbook-${source.cycle}`,
          sourceSheet: sheetName,
          sourceRow: row.rowNumber,
          sourceCycle: source.cycle,
          sourceObservationId,
          eventDate: null,
          observedAt: source.retrievedAt,
          evidenceGrade: "A",
          reviewStatus: "automated_official_import",
        };
        const primaryMarker = runoff.hasObservation ? { markerRaw: null, outcomeStatus: "advanced_to_runoff_from_official_row", advanced: true, partySelected: null } : marker;
        const resultPriority = source.cycle * 10 + (rowRole === "candidate_combined_ballot_line" ? 1 : 0);
        if (primary.hasObservation) upsertResult({
          ...base,
          id: `result-${candidacyId}-primary`,
          stage: "primary",
          eventDate: primaryDate,
          votes: primary.votes,
          votesRaw: primary.votesRaw,
          share: primary.share,
          shareRaw: primary.shareRaw,
          ...primaryMarker,
          winner: null,
          winnerBasis: "not_inferred_without_reviewed_contest_system",
          democraticRowLeader: null,
        }, resultPriority);
        if (runoff.hasObservation) upsertResult({
          ...base,
          id: `result-${candidacyId}-primary-runoff`,
          stage: "primary_runoff",
          eventDate: runoffDate,
          votes: runoff.votes,
          votesRaw: runoff.votesRaw,
          share: runoff.share,
          shareRaw: runoff.shareRaw,
          ...marker,
          winner: null,
          winnerBasis: "not_inferred_without_reviewed_contest_system",
          democraticRowLeader: null,
        }, resultPriority);
        evidence.push({
          id: `evidence-fec-${source.cycle}-${slug(sheetName)}-${row.rowNumber}`,
          factType: "candidacy_result_row",
          factId: candidacyId,
          sourceId: `fec-results-${source.cycle}`,
          documentId: `fec-workbook-${source.cycle}`,
          locator: `${sheetName}, Excel row ${row.rowNumber}`,
          evidenceGrade: "A",
          reviewStatus: "automated_official_import",
          rationale: "Candidate and stage result imported from the official FEC federal election compilation.",
        });
        importedRows += 1;
        sheetImported += 1;
      }
      sheetCounts.push({ sheet: sheetName, eligibleRows: sheetEligible, importedRows: sheetImported });
    }
    const cycleObservations = sourceObservations.filter((observation) => observation.sourceCycle === source.cycle);
    coverage.push({ cycle: source.cycle, status: "complete_official_workbook", denominatorEligible: true, eligibleDemocraticPrimaryRows: eligibleRows, importedRows, importRate: eligibleRows ? importedRows / eligibleRows : 1, candidateBallotRows: cycleObservations.filter((observation) => observation.rowRole.startsWith("candidate_")).length, writeInAggregateRows: cycleObservations.filter((observation) => observation.rowRole === "write_in_aggregate").length, sheets: sheetCounts });
  }

  const results = [...resultsById.values()];
  for (const fecCandidateId of conflictingFecIds) {
    for (const person of peopleById.values()) if (person.source === "fec_result_compilation" && person.fecCandidateId === fecCandidateId) {
      person.identityStatus = "conflicting_fec_candidate_id";
      person.identityReason = `Official compilation publishes ${fecCandidateId} for incompatible candidate names; entity link requires review.`;
    }
    for (const candidacy of candidaciesById.values()) if (candidacy.fecCandidateId === fecCandidateId) {
      candidacy.identityStatus = "conflicting_fec_candidate_id";
      candidacy.identityReason = `Official compilation publishes ${fecCandidateId} for incompatible candidate names; row remains separate.`;
    }
  }

  for (const stage of ["primary", "primary_runoff"]) {
    const groups = new Map();
    for (const result of results.filter((item) => item.stage === stage)) {
      if (!groups.has(result.contestId)) groups.set(result.contestId, []);
      groups.get(result.contestId).push(result);
    }
    for (const rows of groups.values()) {
      const numeric = rows.filter((row) => Number.isFinite(row.votes)).sort((left, right) => right.votes - left.votes);
      if (numeric.length && (numeric.length === 1 || numeric[0].votes > numeric[1].votes)) {
        numeric[0].democraticRowLeader = true;
        for (const row of rows.filter((item) => item !== numeric[0])) {
          row.democraticRowLeader = false;
        }
      } else if (rows.length === 1 && /unopposed/i.test(rows[0].votesRaw ?? "")) {
        rows[0].democraticRowLeader = true;
      }
    }
  }

  for (const candidacy of candidaciesById.values()) {
    const candidateResults = results.filter((result) => result.candidacyId === candidacy.id);
    candidacy.primaryWinner = null;
    candidacy.advanced = candidateResults.some((result) => result.advanced === true) ? true : null;
    candidacy.partySelected = candidateResults.some((result) => result.partySelected === true) ? true : null;
  }

  return {
    people: [...peopleById.values()].sort((left, right) => left.name.localeCompare(right.name)),
    contests: [...contestsById.values()].sort((left, right) => left.id.localeCompare(right.id)),
    candidacies: [...candidaciesById.values()].sort((left, right) => left.id.localeCompare(right.id)),
    results: results.map(({ activePriority, ...result }) => result).sort((left, right) => left.id.localeCompare(right.id)),
    sourceObservations: sourceObservations.sort((left, right) => left.id.localeCompare(right.id)),
    evidence: evidence.sort((left, right) => left.id.localeCompare(right.id)),
    coverage,
  };
}

function buildSourcesAndEvidence(fec, campRelationships) {
  const sources = [];
  const documents = [];
  const evidence = [...fec.evidence];
  for (const source of legacy.sources) {
    sources.push({
      id: `legacy-${source.id}`,
      publisher: source.publisher,
      title: source.title,
      canonicalUrl: source.url,
      kind: source.kind,
      license: "Source publisher retains rights; only cited observations are redistributed.",
      publicationDate: null,
      retrievedAt: isoInstant(source.accessed),
      reviewStatus: "legacy_reviewed",
    });
    documents.push({
      id: `legacy-document-${source.id}`,
      sourceId: `legacy-${source.id}`,
      canonicalUrl: source.url,
      archiveUrl: null,
      publicationDate: null,
      retrievedAt: isoInstant(source.accessed),
      contentHash: null,
      rawPath: null,
      parserVersion: null,
      retrievalStatus: "linked_not_archived",
    });
  }
  for (const source of fecSources) {
    sources.push({
      id: `fec-results-${source.cycle}`,
      publisher: "Federal Election Commission",
      title: `Federal Elections ${source.cycle}: House and Senate results`,
      canonicalUrl: source.landingPage,
      kind: "official_government_data",
      license: "United States federal public data; source citation retained.",
      publicationDate: source.publishedAt,
      retrievedAt: source.retrievedAt,
      reviewStatus: "hash_verified",
    });
    documents.push({
      id: `fec-workbook-${source.cycle}`,
      sourceId: `fec-results-${source.cycle}`,
      canonicalUrl: source.downloadUrl,
      archiveUrl: null,
      publicationDate: source.publishedAt,
      retrievedAt: source.retrievedAt,
      contentHash: source.sha256,
      rawPath: source.localPath,
      parserVersion: "fec-xlsx-v1",
      retrievalStatus: "verified_local_raw",
    });
  }
  const coreSourceByUrl = new Map();
  for (const relationship of core.relationships) {
    let sourceId = coreSourceByUrl.get(relationship.sourceUrl);
    if (!sourceId) {
      sourceId = `core-${shortHash(relationship.sourceUrl)}`;
      coreSourceByUrl.set(relationship.sourceUrl, sourceId);
      sources.push({
        id: sourceId,
        publisher: new URL(relationship.sourceUrl).hostname,
        title: relationship.sourceTitle,
        canonicalUrl: relationship.sourceUrl,
        kind: "official_organization_record",
        license: "Source publisher retains rights; relation facts and citations are redistributed.",
        publicationDate: relationship.sourceDate,
        retrievedAt: relationship.observedAt,
        reviewStatus: relationship.reviewStatus,
      });
      documents.push({
        id: `${sourceId}-document`,
        sourceId,
        canonicalUrl: relationship.sourceUrl,
        archiveUrl: null,
        publicationDate: relationship.sourceDate,
        retrievedAt: relationship.observedAt,
        contentHash: null,
        rawPath: null,
        parserVersion: null,
        retrievalStatus: "reviewed_link",
      });
    }
    evidence.push({
      id: `evidence-${relationship.id}`,
      factType: "organization_relationship",
      factId: relationship.id,
      sourceId,
      documentId: `${sourceId}-document`,
      locator: relationship.locator,
      evidenceGrade: relationship.evidenceGrade,
      reviewStatus: relationship.reviewStatus,
      rationale: relationship.rationale,
    });
  }
  for (const derived of campRelationships) {
    evidence.push({
      id: `evidence-${derived.id}`,
      factType: "camp_derivation",
      factId: derived.id,
      sourceId: null,
      documentId: null,
      locator: `taxonomy-v1; inputs ${derived.sourceRelationshipIds.join(", ")}`,
      evidenceGrade: "C",
      reviewStatus: derived.reviewStatus,
      rationale: derived.rationale,
      inputFactIds: derived.sourceRelationshipIds,
    });
  }
  return {
    sources: sources.sort((left, right) => left.id.localeCompare(right.id)),
    documents: documents.sort((left, right) => left.id.localeCompare(right.id)),
    evidence: evidence.sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function buildMetrics() {
  const formalCampMap = { progressive: "cpc_aligned", newdem: "new_dem_aligned", bluedog: "blue_dog_aligned" };
  const metricDefinitions = legacy.metrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    domain: metric.domain === "agenda" || metric.domain === "momentum" ? "context" : metric.domain,
    description: metric.description,
    numerator: metric.id,
    denominator: metric.id.includes("share") ? "reported category total" : metric.id.includes("per_member") ? "published caucus members" : null,
    eligibleUniverse: "Reviewed formal organization-aligned camps represented in the legacy v2.1 release",
    direction: "higher",
    transformation: core.referenceBounds[metric.id]?.transform ?? "linear",
    window: metric.asOf,
    minimumSample: 1,
    coverageThreshold: 1,
    missingDataPolicy: "preserve_null_and_exclude",
    methodVersion: "legacy-migration-v1",
    format: metric.format,
    legacyIncluded: metric.included,
    scoreEligible: Boolean(core.referenceBounds[metric.id]) && !["source_coverage", "recent_win_points"].includes(metric.id),
    caveat: metric.caveat,
    sourceIds: metric.sources.map((sourceId) => `legacy-${sourceId}`),
  }));
  metricDefinitions.push({
    id: "primary_endorsement_win_rate",
    label: "Primary wins per tracked 2026 PAC endorsement",
    domain: "electoral",
    description: "Jeffreys beta-binomial estimate from confirmed wins divided by tracked PAC endorsees in the legacy reviewed set.",
    numerator: "known_primary_wins_2026",
    denominator: "endorsed_candidates_2026",
    eligibleUniverse: "PAC endorsees tracked in the reviewed 2026 legacy snapshot; not the complete historical FEC candidate universe",
    direction: "higher",
    transformation: "linear",
    window: "2026 cycle through 2026-08-28",
    minimumSample: 1,
    coverageThreshold: 1,
    missingDataPolicy: "zero_denominator_is_null",
    methodVersion: "jeffreys-beta-binomial-v1",
    format: "rate",
    legacyIncluded: false,
    scoreEligible: true,
    caveat: "The denominator is the reviewed PAC-endorsement inventory, not every aligned candidate or race.",
    sourceIds: [...new Set(legacy.metrics.find((metric) => metric.id === "known_primary_wins_2026").sources.map((id) => `legacy-${id}`))],
  });

  const observations = [];
  for (const metric of legacy.metrics) {
    for (const [legacyCampId, value] of Object.entries(metric.values)) observations.push({
      id: `observation-${metric.id}-${formalCampMap[legacyCampId]}`,
      metricId: metric.id,
      campId: formalCampMap[legacyCampId],
      periodStart: null,
      periodEnd: metric.asOf,
      value: finiteOrNull(value),
      numerator: null,
      denominator: null,
      interval80: null,
      interval95: null,
      coverage: value === null ? 0 : 1,
      freshness: metric.asOf,
      evidenceGrade: "B",
      reviewStatus: "legacy_reviewed_migration",
      methodVersion: "legacy-migration-v1",
      sourceIds: metric.sources.map((sourceId) => `legacy-${sourceId}`),
      caveat: metric.caveat,
    });
  }
  const endorsed = legacy.metrics.find((metric) => metric.id === "endorsed_candidates_2026");
  const wins = legacy.metrics.find((metric) => metric.id === "known_primary_wins_2026");
  for (const legacyCampId of Object.keys(formalCampMap)) {
    const numerator = wins.values[legacyCampId];
    const denominator = endorsed.values[legacyCampId];
    const estimate = jeffreysRate(numerator, denominator);
    observations.push({
      id: `observation-primary_endorsement_win_rate-${formalCampMap[legacyCampId]}`,
      metricId: "primary_endorsement_win_rate",
      campId: formalCampMap[legacyCampId],
      periodStart: "2025-11-05",
      periodEnd: core.reviewedThrough,
      value: estimate.value,
      numerator,
      denominator,
      interval80: estimate.interval80,
      interval95: estimate.interval95,
      coverage: 1,
      freshness: core.reviewedThrough,
      evidenceGrade: "B",
      reviewStatus: "derived_from_legacy_reviewed_records",
      methodVersion: "jeffreys-beta-binomial-v1",
      minimumSample: 1,
      sourceIds: [...new Set([...wins.sources, ...endorsed.sources].map((id) => `legacy-${id}`))],
      caveat: "Only endorsements and wins present in the reviewed legacy snapshot enter this estimate.",
    });
  }
  return { metricDefinitions, observations };
}

function addSensitivity(modelScores, metrics) {
  const metricIds = [...new Set(core.model.domains.flatMap((domain) => domain.measures.map((measure) => measure.id)))];
  const byCamp = new Map(modelScores.map((score) => [score.campId, score]));
  for (const camp of core.camps) {
    const target = byCamp.get(camp.id);
    target.leaveOneMetricOut = metricIds.map((metricId) => {
      const model = structuredClone(core.model);
      for (const domain of model.domains) {
        domain.measures = domain.measures.filter((measure) => measure.id !== metricId);
        const total = domain.measures.reduce((sum, measure) => sum + measure.weight, 0);
        if (total) for (const measure of domain.measures) measure.weight /= total;
      }
      const score = calculateBalancedModel({ camps: core.camps, model, observations: metrics.observations, referenceBounds: core.referenceBounds }).find((item) => item.campId === camp.id);
      return { metricId, score: score.score, sufficient: score.sufficient };
    });
    const weightRuns = [];
    for (const domain of core.model.domains) {
      for (const multiplier of [0.8, 1.2]) {
        const model = structuredClone(core.model);
        const changed = model.domains.find((item) => item.id === domain.id);
        changed.weight *= multiplier;
        const total = model.domains.reduce((sum, item) => sum + item.weight, 0);
        for (const item of model.domains) item.weight /= total;
        const score = calculateBalancedModel({ camps: core.camps, model, observations: metrics.observations, referenceBounds: core.referenceBounds }).find((item) => item.campId === camp.id);
        weightRuns.push({ domainId: domain.id, multiplier, score: score.score, sufficient: score.sufficient });
      }
    }
    target.weightSensitivity = weightRuns;
    target.attributionSensitivity = ["full", "confidence_weighted", "split_credit"].map((mode) => ({ mode, score: target.score, note: "Current balanced-core inputs are aggregate reviewed formal-camp observations; attribution changes do not alter them." }));
  }
  const ranked = modelScores.filter((score) => score.score !== null).sort((left, right) => right.score - left.score);
  ranked.forEach((score, index) => { score.rank = index + 1; });
  return modelScores;
}

function toCsv(records) {
  if (!records.length) return "id\n";
  const headers = [...new Set(records.flatMap((record) => Object.keys(record)))];
  const escape = (value) => {
    if (value === null || value === undefined) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `${headers.map(escape).join(",")}\r\n${records.map((record) => headers.map((header) => escape(record[header])).join(",")).join("\r\n")}\r\n`;
}

function insertRows(db, sql, records, values) {
  const statement = db.prepare(sql);
  for (const record of records) statement.run(...values(record));
}

async function createSqlite(path, data) {
  await rm(path, { force: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = DELETE");
  db.exec("PRAGMA user_version = 3");
  db.exec(`
    CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, short_name TEXT, type TEXT NOT NULL, official_url TEXT, json TEXT NOT NULL);
    CREATE TABLE camps (id TEXT PRIMARY KEY, name TEXT NOT NULL, short_name TEXT, color TEXT, definition TEXT NOT NULL, json TEXT NOT NULL);
    CREATE TABLE people (id TEXT PRIMARY KEY, name TEXT NOT NULL, actual_party TEXT, bioguide_id TEXT, fec_candidate_id TEXT, current_camp_ids TEXT NOT NULL, json TEXT NOT NULL);
    CREATE TABLE relationships (id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id), organization_id TEXT NOT NULL REFERENCES organizations(id), relation_type TEXT NOT NULL, valid_from TEXT, valid_to TEXT, cycle INTEGER, evidence_grade TEXT NOT NULL, review_status TEXT NOT NULL, json TEXT NOT NULL);
    CREATE TABLE camp_derivations (id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id), camp_id TEXT NOT NULL REFERENCES camps(id), valid_from TEXT, valid_to TEXT, cycle INTEGER, evidence_grade TEXT NOT NULL, evidence_weight REAL NOT NULL, json TEXT NOT NULL);
    CREATE TABLE sources (id TEXT PRIMARY KEY, publisher TEXT NOT NULL, title TEXT NOT NULL, canonical_url TEXT NOT NULL, kind TEXT NOT NULL, license TEXT, json TEXT NOT NULL);
    CREATE TABLE documents (id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id), canonical_url TEXT NOT NULL, retrieved_at TEXT, content_hash TEXT, raw_path TEXT, parser_version TEXT, json TEXT NOT NULL);
    CREATE TABLE evidence (id TEXT PRIMARY KEY, fact_type TEXT NOT NULL, fact_id TEXT NOT NULL, source_id TEXT REFERENCES sources(id), document_id TEXT REFERENCES documents(id), locator TEXT, evidence_grade TEXT NOT NULL, review_status TEXT NOT NULL, json TEXT NOT NULL);
    CREATE TABLE contests (id TEXT PRIMARY KEY, cycle INTEGER NOT NULL, chamber TEXT NOT NULL, state TEXT, district TEXT, special INTEGER NOT NULL, denominator_complete INTEGER NOT NULL, source_id TEXT REFERENCES sources(id), json TEXT NOT NULL);
    CREATE TABLE candidacies (id TEXT PRIMARY KEY, contest_id TEXT NOT NULL REFERENCES contests(id), person_id TEXT NOT NULL REFERENCES people(id), fec_candidate_id TEXT, candidate_name TEXT NOT NULL, party TEXT, primary_winner INTEGER, json TEXT NOT NULL);
    CREATE TABLE source_observations (id TEXT PRIMARY KEY, contest_id TEXT NOT NULL REFERENCES contests(id), candidacy_id TEXT REFERENCES candidacies(id), row_role TEXT NOT NULL, source_id TEXT NOT NULL REFERENCES sources(id), document_id TEXT NOT NULL REFERENCES documents(id), source_sheet TEXT NOT NULL, source_row INTEGER NOT NULL, event_date TEXT, json TEXT NOT NULL);
    CREATE TABLE election_results (id TEXT PRIMARY KEY, contest_id TEXT NOT NULL REFERENCES contests(id), candidacy_id TEXT NOT NULL REFERENCES candidacies(id), person_id TEXT NOT NULL REFERENCES people(id), stage TEXT NOT NULL, votes INTEGER, votes_raw TEXT, share REAL, winner INTEGER, winner_basis TEXT, source_id TEXT NOT NULL REFERENCES sources(id), json TEXT NOT NULL);
    CREATE TABLE metric_definitions (id TEXT PRIMARY KEY, label TEXT NOT NULL, domain TEXT NOT NULL, numerator TEXT, denominator TEXT, eligible_universe TEXT NOT NULL, direction TEXT NOT NULL, transformation TEXT NOT NULL, method_version TEXT NOT NULL, score_eligible INTEGER NOT NULL, json TEXT NOT NULL);
    CREATE TABLE metric_observations (id TEXT PRIMARY KEY, metric_id TEXT NOT NULL REFERENCES metric_definitions(id), camp_id TEXT NOT NULL REFERENCES camps(id), period_end TEXT, value REAL, numerator REAL, denominator REAL, coverage REAL NOT NULL, evidence_grade TEXT NOT NULL, method_version TEXT NOT NULL, json TEXT NOT NULL);
    CREATE TABLE model_scores (camp_id TEXT PRIMARY KEY REFERENCES camps(id), score REAL, rank INTEGER, sufficient INTEGER NOT NULL, reason TEXT, json TEXT NOT NULL);
    CREATE TABLE coverage (cycle INTEGER PRIMARY KEY, status TEXT NOT NULL, denominator_eligible INTEGER NOT NULL, eligible_rows INTEGER, imported_rows INTEGER, import_rate REAL, reason TEXT, json TEXT NOT NULL);
    CREATE INDEX idx_people_fec_candidate_id ON people(fec_candidate_id);
    CREATE INDEX idx_relationships_person_validity ON relationships(person_id, valid_from, valid_to);
    CREATE INDEX idx_camp_derivations_camp_person ON camp_derivations(camp_id, person_id);
    CREATE INDEX idx_contests_cycle_chamber_state ON contests(cycle, chamber, state);
    CREATE INDEX idx_candidacies_contest ON candidacies(contest_id);
    CREATE INDEX idx_source_observations_contest_row ON source_observations(contest_id, source_id, source_sheet, source_row);
    CREATE INDEX idx_election_results_contest_stage ON election_results(contest_id, stage);
    CREATE INDEX idx_metric_observations_camp_metric ON metric_observations(camp_id, metric_id);
    CREATE INDEX idx_evidence_fact ON evidence(fact_type, fact_id);
  `);
  db.exec("BEGIN");
  try {
    insertRows(db, "INSERT INTO organizations VALUES (?, ?, ?, ?, ?, ?)", data.organizations, (item) => [item.id, item.name, item.shortName, item.type, item.officialUrl, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO camps VALUES (?, ?, ?, ?, ?, ?)", data.camps, (item) => [item.id, item.name, item.shortName, item.color, item.definition, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO people VALUES (?, ?, ?, ?, ?, ?, ?)", data.people, (item) => [item.id, item.name, item.actualParty, item.bioguideId, item.fecCandidateId, JSON.stringify(item.currentCampIds ?? []), JSON.stringify(item)]);
    insertRows(db, "INSERT INTO relationships VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", data.relationships, (item) => [item.id, item.personId, item.organizationId, item.type, item.validFrom, item.validTo, item.cycle ?? null, item.evidenceGrade, item.reviewStatus, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO camp_derivations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", data.campRelationships, (item) => [item.id, item.personId, item.campId, item.validFrom, item.validTo, item.cycle ?? null, item.evidenceGrade, item.evidenceWeight, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO sources VALUES (?, ?, ?, ?, ?, ?, ?)", data.sources, (item) => [item.id, item.publisher, item.title, item.canonicalUrl, item.kind, item.license, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?)", data.documents, (item) => [item.id, item.sourceId, item.canonicalUrl, item.retrievedAt, item.contentHash, item.rawPath, item.parserVersion, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO evidence VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", data.evidence, (item) => [item.id, item.factType, item.factId, item.sourceId, item.documentId, item.locator, item.evidenceGrade, item.reviewStatus, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO contests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", data.contests, (item) => [item.id, item.cycle, item.chamber, item.state, item.district, item.special ? 1 : 0, item.denominatorComplete ? 1 : 0, item.sourceId, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO candidacies VALUES (?, ?, ?, ?, ?, ?, ?, ?)", data.candidacies, (item) => [item.id, item.contestId, item.personId, item.fecCandidateId, item.candidateName, item.party, item.primaryWinner === null ? null : item.primaryWinner ? 1 : 0, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO source_observations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", data.sourceObservations, (item) => [item.id, item.contestId, item.canonicalCandidacyId, item.rowRole, item.sourceId, item.documentId, item.sourceSheet, item.sourceRow, item.primaryDate, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO election_results VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", data.results, (item) => [item.id, item.contestId, item.candidacyId, item.personId, item.stage, item.votes, item.votesRaw, item.share, item.winner === null ? null : item.winner ? 1 : 0, item.winnerBasis, item.sourceId, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO metric_definitions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", data.metricDefinitions, (item) => [item.id, item.label, item.domain, item.numerator, item.denominator, item.eligibleUniverse, item.direction, item.transformation, item.methodVersion, item.scoreEligible ? 1 : 0, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO metric_observations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", data.metricObservations, (item) => [item.id, item.metricId, item.campId, item.periodEnd, item.value, item.numerator, item.denominator, item.coverage, item.evidenceGrade, item.methodVersion, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO model_scores VALUES (?, ?, ?, ?, ?, ?)", data.modelScores, (item) => [item.campId, item.score, item.rank ?? null, item.sufficient ? 1 : 0, item.reason, JSON.stringify(item)]);
    insertRows(db, "INSERT INTO coverage VALUES (?, ?, ?, ?, ?, ?, ?, ?)", data.coverage, (item) => [item.cycle, item.status, item.denominatorEligible ? 1 : 0, item.eligibleDemocraticPrimaryRows ?? null, item.importedRows ?? null, item.importRate ?? null, item.reason ?? null, JSON.stringify(item)]);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  db.exec("PRAGMA optimize");
  const integrity = db.prepare("PRAGMA integrity_check").all();
  const foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
  if (integrity.length !== 1 || integrity[0].integrity_check !== "ok" || foreignKeys.length) throw new Error(`SQLite validation failed: ${JSON.stringify({ integrity, foreignKeys })}`);
  db.close();
}

async function createCsvArchive(path, tables) {
  const temp = await mkdtemp(join(tmpdir(), "democratic-factions-csv-"));
  try {
    for (const [name, records] of Object.entries(tables)) await writeFile(join(temp, `${name}.csv`), toCsv(records));
    const dictionary = Object.entries(tables).flatMap(([table, records]) => {
      const sample = records[0] ?? {};
      return Object.keys(sample).map((column) => ({ table, column, inferredType: sample[column] === null ? "nullable" : Array.isArray(sample[column]) ? "json_array" : typeof sample[column], nullable: records.some((record) => record[column] === null || record[column] === undefined), unit: null }));
    });
    await writeFile(join(temp, "data_dictionary.csv"), toCsv(dictionary));
    const fixedTime = new Date(`${generatedOn}T00:00:00Z`);
    for (const name of await readdir(temp)) await utimes(join(temp, name), fixedTime, fixedTime);
    await rm(path, { force: true });
    execFileSync("zip", ["-X", "-q", "-r", path, "."], { cwd: temp });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

await rm(releaseRoot, { recursive: true, force: true });
await rm(downloadsRoot, { recursive: true, force: true });
await mkdir(releaseRoot, { recursive: true });
await mkdir(downloadsRoot, { recursive: true });

const fec = await ingestFec();
const campRelationships = deriveCampRelationships(core.relationships);
const people = fec.people.map((person) => ({
  ...person,
  currentCampIds: campRelationships.filter((relationship) => relationship.personId === person.id && campIsCurrent(relationship)).map((relationship) => relationship.campId).filter((value, index, values) => values.indexOf(value) === index),
}));
const sourceData = buildSourcesAndEvidence(fec, campRelationships);
const metrics = buildMetrics();
const modelScores = addSensitivity(calculateBalancedModel({ camps: core.camps, model: core.model, observations: metrics.observations, referenceBounds: core.referenceBounds }), metrics);
const coverageByCycle = new Map(core.coverage.map((item) => [item.cycle, { ...item }]));
for (const item of fec.coverage) coverageByCycle.set(item.cycle, { ...coverageByCycle.get(item.cycle), ...item });
const coverage = [...coverageByCycle.values()].sort((left, right) => left.cycle - right.cycle);

const legacyContext = {
  schema: "power-data-v2.1",
  archivedAt: generatedOn,
  meta: legacy.meta,
  factions: legacy.factions,
  overlaps: legacy.overlaps,
  primaryRaces: legacy.primaryRaces,
  financeRaces: legacy.financeRaces,
  publicIndicators: legacy.publicIndicators,
  events: legacy.events,
  measureCatalogue: legacy.measureCatalogue,
  history: legacy.history,
};
const quality = {
  releaseId,
  schemaVersion: core.schemaVersion,
  methodVersion: core.methodVersion,
  reviewedThrough: core.reviewedThrough,
  counts: {
    organizations: core.organizations.length,
    camps: core.camps.length,
    people: people.length,
    observedRelationships: core.relationships.length,
    campDerivations: campRelationships.length,
    contests: fec.contests.length,
    candidacies: fec.candidacies.length,
    electionResults: fec.results.length,
    sourceObservations: fec.sourceObservations.length,
    metricDefinitions: metrics.metricDefinitions.length,
    metricObservations: metrics.observations.length,
    sources: sourceData.sources.length,
    evidenceRecords: sourceData.evidence.length,
    unresolvedIdentities: people.filter((person) => person.identityStatus === "unresolved_fec_candidate_id").length,
    conflictingIdentityRows: fec.candidacies.filter((candidacy) => candidacy.identityStatus === "conflicting_fec_candidate_id").length,
    legacySourcesMigrated: legacy.sources.length,
    legacyMeasuresMigrated: legacy.metrics.length,
    legacyPrimaryRacesMigrated: legacy.primaryRaces.length,
    legacyFinanceCasesMigrated: legacy.financeRaces.length,
    legacyOpinionRecordsMigrated: legacy.publicIndicators.length,
    legacyEventsMigrated: legacy.events.length,
    legacySnapshotsMigrated: legacy.history.length
  },
  coverage,
  reviewQueue: [
    { id: "gap-fec-2024", severity: "coverage_gap", status: "pending_external_publication", message: "Comparable official FEC House and Senate result workbook for 2024 is not yet published." },
    { id: "gap-state-2026", severity: "partial_denominator", status: "review_required", message: "2026 state-certified coverage is partial and excluded from national rates." },
    { id: "gap-historical-rosters", severity: "temporal_gap", status: "review_required", message: "Historical caucus rosters outside the regression fixtures remain under reconstruction." },
    { id: "gap-contest-systems", severity: "outcome_semantics", status: "review_required", message: "FEC W, *, #, and W# markers are preserved as advancement or party-selection signals; nomination winners remain null until top-two, runoff, convention, withdrawal, and replacement rules are reviewed." },
    { id: "gap-contest-dates", severity: "temporal_gap", status: "review_required", message: `${fec.contests.filter((contest) => !contest.primaryDate).length} contests lack a recoverable primary or selection date in the official date sheet or row footnote and remain excluded from day-level comparisons.` },
    { id: "gap-reference-distribution", severity: "method_gap", status: "review_required", message: "balanced-core-v1 uses fixed provisional anchors rather than a complete empirical 2018-present reference distribution; Model Lab results remain explicitly provisional." },
    { id: "gap-unresolved-identities", severity: "identity_gap", status: "review_required", message: `${people.filter((person) => person.identityStatus === "unresolved_fec_candidate_id").length} official result rows lack a valid FEC candidate ID and remain deliberately row-specific rather than falsely merged.` },
    { id: "gap-conflicting-identifiers", severity: "identity_conflict", status: "review_required", message: `${fec.candidacies.filter((candidacy) => candidacy.identityStatus === "conflicting_fec_candidate_id").length} official result rows reuse an FEC candidate ID across incompatible names; rows remain separate and joins require review.` }
  ],
  exclusions: ["AP Elections licensed feed", "Cook PVI", "Roper iPoll microdata", "FEC individual contributor addresses"],
  missingDataPolicy: "Null remains distinct from a reported zero. Partial universes never produce national rates.",
};

const data = {
  organizations: core.organizations,
  camps: core.camps,
  people,
  relationships: core.relationships,
  campRelationships,
  sources: sourceData.sources,
  documents: sourceData.documents,
  evidence: sourceData.evidence,
  contests: fec.contests,
  candidacies: fec.candidacies,
  results: fec.results,
  sourceObservations: fec.sourceObservations,
  metricDefinitions: metrics.metricDefinitions,
  metricObservations: metrics.observations,
  modelScores,
  coverage,
};

const partitions = [
  ["entities/organizations.json", data.organizations],
  ["entities/camps.json", data.camps],
  ["entities/people.json", data.people],
  ["facts/relationships.json", data.relationships],
  ["facts/camp-derivations.json", data.campRelationships],
  ["facts/contests.json", data.contests],
  ["facts/candidacies.json", data.candidacies],
  ["facts/election-results.json", data.results],
  ["facts/source-observations.json", data.sourceObservations],
  ["metrics/definitions.json", data.metricDefinitions],
  ["metrics/observations.json", data.metricObservations],
  ["metrics/balanced-core-v1.json", { model: core.model, referenceDistribution: core.referenceDistribution, referenceBounds: core.referenceBounds, scores: data.modelScores }],
  ["sources/sources.json", data.sources],
  ["sources/documents.json", data.documents],
  ["sources/evidence.json", data.evidence],
  ["quality/coverage.json", quality],
  ["context/legacy-v2.1.json", legacyContext],
];

const partitionManifest = [];
for (const [partitionPath, payload] of partitions) {
  const absolute = join(releaseRoot, partitionPath);
  await writeJson(absolute, payload);
  const fileStats = await stat(absolute);
  partitionManifest.push({ path: `data/v3/releases/${releaseId}/${partitionPath}`, rowCount: Array.isArray(payload) ? payload.length : 1, bytes: fileStats.size, sha256: await hashFile(absolute) });
}

const sqlitePath = join(downloadsRoot, "democratic-factions.sqlite");
const csvPath = join(downloadsRoot, "core-csv.zip");
await createSqlite(sqlitePath, data);
await createCsvArchive(csvPath, {
  organizations: data.organizations,
  camps: data.camps,
  people: data.people,
  relationships: data.relationships,
  camp_derivations: data.campRelationships,
  sources: data.sources,
  documents: data.documents,
  evidence: data.evidence,
  contests: data.contests,
  candidacies: data.candidacies,
  election_results: data.results,
  source_observations: data.sourceObservations,
  metric_definitions: data.metricDefinitions,
  metric_observations: data.metricObservations,
  model_scores: data.modelScores,
  coverage: data.coverage,
});
const downloadManifest = [];
for (const artifact of [sqlitePath, csvPath]) {
  const fileStats = await stat(artifact);
  downloadManifest.push({ path: `downloads/${releaseId}/${basename(artifact)}`, bytes: fileStats.size, sha256: await hashFile(artifact) });
}

let buildCommit = existingBuildCommit ?? process.env.GITHUB_SHA ?? null;
if (!buildCommit) {
  try { buildCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); }
  catch { buildCommit = "unknown"; }
}
const manifest = {
  releaseId,
  title: core.title,
  scope: core.scope,
  schemaVersion: core.schemaVersion,
  methodVersion: core.methodVersion,
  generatedOn,
  reviewedThrough: core.reviewedThrough,
  buildCommit,
  immutable: true,
  attributionModes: ["full", "confidence_weighted", "split_credit"],
  partitions: partitionManifest,
  downloads: downloadManifest,
  corrections: ["Replaces v2.1 within-visible-camp min-max scoring with fixed provisional anchors and explicit coverage gates.", "Preserves missing FEC values as null rather than zero.", "Separates raw FEC source rows, advancement markers, party selection, and nomination-winner claims.", "Publishes the absence of a comparable 2024 FEC congressional results workbook as a coverage gap."],
};
const manifestPath = join(releaseRoot, "manifest.json");
await writeJson(manifestPath, manifest);
const releaseAlreadyExists = await pathExists(finalReleaseRoot);
const downloadsAlreadyExist = await pathExists(finalDownloadsRoot);
if (releaseAlreadyExists !== downloadsAlreadyExist) throw new Error(`Immutable release ${releaseId} is only partially present; refusing to overwrite it.`);
if (releaseAlreadyExists) {
  const [existingRelease, rebuiltRelease, existingDownloads, rebuiltDownloads] = await Promise.all([
    directoryInventory(finalReleaseRoot), directoryInventory(releaseRoot), directoryInventory(finalDownloadsRoot), directoryInventory(downloadsRoot),
  ]);
  if (JSON.stringify(existingRelease) !== JSON.stringify(rebuiltRelease) || JSON.stringify(existingDownloads) !== JSON.stringify(rebuiltDownloads)) throw new Error(`Immutable release ${releaseId} already exists with different bytes.`);
  await rm(releaseRoot, { recursive: true, force: true });
  await rm(downloadsRoot, { recursive: true, force: true });
} else {
  await rename(releaseRoot, finalReleaseRoot);
  await rename(downloadsRoot, finalDownloadsRoot);
}
const finalManifestPath = join(finalReleaseRoot, "manifest.json");
await writeJson(join(publicRoot, "data/v3/latest.json"), {
  releaseId,
  manifest: `data/v3/releases/${releaseId}/manifest.json`,
  manifestSha256: await hashFile(finalManifestPath),
  generatedOn,
  reviewedThrough: core.reviewedThrough,
});

console.log(`Built ${releaseId}: ${people.length} people, ${fec.contests.length} contests, ${fec.candidacies.length} Democratic candidacies, ${fec.results.length} primary-stage results, ${sourceData.sources.length} sources.`);
