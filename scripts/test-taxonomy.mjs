import assert from "node:assert/strict";
import { deriveCampRelationships } from "./lib/taxonomy.mjs";

const relation = (id, organizationId, cycle, evidenceGrade = "A") => ({ id, personId: "fixture-person", organizationId, type: "endorsement", cycle, validFrom: `${cycle}-01-01`, validTo: `${cycle + 1}-01-01`, sourceDate: `${cycle}-01-01`, observedAt: `${cycle}-01-02T00:00:00Z`, evidenceGrade, reviewer: "fixture" });
const wfpOnly = deriveCampRelationships([relation("wfp-only", "working_families_party", 2024)]);
assert.equal(wfpOnly.length, 0, "WFP alone must not establish movement-left camp identity");

const compound = deriveCampRelationships([relation("wfp", "working_families_party", 2024), relation("or", "our_revolution", 2024, "B")]);
assert.equal(compound.length, 1);
assert.equal(compound[0].campId, "movement_left_network");
assert.equal(compound[0].evidenceWeight, 0.8, "compound derivation must inherit the weakest triggering evidence");
assert.deepEqual(compound[0].sourceRelationshipIds, ["wfp", "or"]);

assert.equal(deriveCampRelationships([relation("wfp", "working_families_party", 2022), relation("or", "our_revolution", 2024)]).length, 0, "endorsements from different cycles must not combine");
const dccc = deriveCampRelationships([relation("dccc", "dccc", 2024)]);
assert.deepEqual(dccc.map((item) => item.campId), ["party_network"], "DCCC support must not infer New Dem identity");

console.log("Taxonomy regression tests passed.");
