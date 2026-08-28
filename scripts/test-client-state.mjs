import assert from "node:assert/strict";
import { createWorkspaceEnvelope, validateWorkspaceEnvelope } from "../src/lib/workspace.ts";
import { defaultResearchState, parseResearchState, serializeResearchState } from "../src/lib/urlState.ts";

const parsed = parseResearchState("?v=1&view=model&from=2020-01-01&to=2024-12-31&cycles=2024,2020,2024,1996&states=NY,CA,NY&camps=new_dem_aligned,cpc_aligned&weights=money:17.5,institutions:30&custom=ignored&q=AOC%20%26%20allies");
assert.equal(parsed.view, "model");
assert.deepEqual(parsed.cycles, [2020, 2024]);
assert.deepEqual(parsed.states, ["CA", "NY"]);
assert.deepEqual(parsed.modelWeights, { institutions: 30, money: 17.5 });
assert.equal(parsed.search, "AOC & allies");

const canonicalUrl = serializeResearchState({ ...parsed, states: ["NY", "CA", "NY"], camps: ["new_dem_aligned", "cpc_aligned", "new_dem_aligned"] }, "/democratic-party-crosscurrents/");
assert.equal(canonicalUrl, "/democratic-party-crosscurrents/?v=1&view=model&from=2020-01-01&to=2024-12-31&cycles=2020%2C2024&states=CA%2CNY&camps=cpc_aligned%2Cnew_dem_aligned&weights=institutions%3A30%2Cmoney%3A17.5&q=AOC+%26+allies");
assert.deepEqual(parseResearchState(canonicalUrl.split("?")[1] ? `?${canonicalUrl.split("?")[1]}` : ""), parsed);

assert.deepEqual(parseResearchState("?v=2&view=money"), defaultResearchState, "future URL-state versions must fall back atomically");
assert.equal(parseResearchState("?v=1&from=2024-02-31").from, defaultResearchState.from, "impossible dates must be rejected");
assert.equal(parseResearchState("?v=1&from=2025-01-01&to=2020-01-01").from, defaultResearchState.from, "reversed date ranges must be rejected");

const timestamp = "2026-08-28T03:00:00.000Z";
const emptySnapshot = { savedViews: [], watchlists: [], notes: [], sourceBookmarks: [], sessions: [], campOverrides: [] };
const snapshot = {
  ...emptySnapshot,
  notes: [{ id: "note-1", entityType: "person", entityId: "sarah_mcbride", text: "Line one\nLine two — Unicode", createdAt: timestamp, updatedAt: timestamp }],
  campOverrides: [{ id: "override-1", personId: "sarah_mcbride", campId: "new_dem_aligned", validFrom: "2025-01-03", validTo: "2027-01-03", evidenceRefs: ["https://example.org/source"], confidence: 0.8, rationale: "Local research hypothesis", status: "draft", createdAt: timestamp, updatedAt: timestamp }],
};
const envelope = await createWorkspaceEnvelope(snapshot, "2026-08-28-v3-fixture", timestamp);
assert.deepEqual(await validateWorkspaceEnvelope(envelope), envelope, "workspace export must validate without semantic loss");

await assert.rejects(() => validateWorkspaceEnvelope({ ...envelope, baseReleaseId: "tampered" }), /checksum/i, "tampering must fail before import");
const duplicateEnvelope = await createWorkspaceEnvelope({ ...snapshot, notes: [...snapshot.notes, { ...snapshot.notes[0] }] }, "2026-08-28-v3-fixture", timestamp);
await assert.rejects(() => validateWorkspaceEnvelope(duplicateEnvelope), /duplicate ID/i);
const undatedEnvelope = await createWorkspaceEnvelope({ ...snapshot, campOverrides: [{ ...snapshot.campOverrides[0], validFrom: "", validTo: "" }] }, "2026-08-28-v3-fixture", timestamp);
await assert.rejects(() => validateWorkspaceEnvelope(undatedEnvelope), /date interval/i);

console.log("Client-state and workspace contract tests passed.");
