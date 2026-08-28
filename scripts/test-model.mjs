import assert from "node:assert/strict";
import { calculateBalancedModel, fixedNormalize, jeffreysRate } from "./lib/model.mjs";

assert.equal(fixedNormalize(10, { lower: 0, upper: 20, transform: "linear", direction: "higher" }), 50);
assert.equal(fixedNormalize(20, { lower: 0, upper: 20, transform: "linear", direction: "higher" }), 100);
assert.equal(fixedNormalize(20, { lower: 0, upper: 20, transform: "linear", direction: "lower" }), 0);
assert.equal(fixedNormalize(10, { lower: 0, upper: 20, transform: "linear", direction: "lower" }), 50);
assert.equal(jeffreysRate(0, 0).value, null);
assert.ok(Math.abs(jeffreysRate(3, 10).value - 3.5 / 11) < 1e-12);
assert.ok(jeffreysRate(3, 10).interval95[0] < jeffreysRate(3, 10).value);
assert.ok(jeffreysRate(3, 10).interval95[1] > jeffreysRate(3, 10).value);

const camps = [{ id: "test" }];
const bounds = { a: { lower: 0, upper: 100, transform: "linear", direction: "higher" }, b: { lower: 0, upper: 100, transform: "linear", direction: "higher" } };
const observations = [{ campId: "test", metricId: "a", value: 50, denominator: 5 }];
const insufficient = calculateBalancedModel({ camps, referenceBounds: bounds, observations, model: { coverageThreshold: 0.7, domains: [{ id: "domain", label: "Domain", weight: 1, measures: [{ id: "a", weight: 0.6 }, { id: "b", weight: 0.4 }] }] } })[0];
assert.equal(insufficient.score, null);
assert.equal(insufficient.domainScores[0].coverage, 0.6);
const sufficient = calculateBalancedModel({ camps, referenceBounds: bounds, observations, model: { coverageThreshold: 0.7, domains: [{ id: "domain", label: "Domain", weight: 1, measures: [{ id: "a", weight: 0.8 }, { id: "b", weight: 0.2 }] }] } })[0];
assert.equal(sufficient.score, 50);
const zeroWeight = calculateBalancedModel({ camps, referenceBounds: bounds, observations, model: { coverageThreshold: 0.7, domains: [{ id: "domain", label: "Domain", weight: 0, measures: [{ id: "a", weight: 1 }] }] } })[0];
assert.equal(zeroWeight.score, null);

console.log("Model formula fixtures passed.");
