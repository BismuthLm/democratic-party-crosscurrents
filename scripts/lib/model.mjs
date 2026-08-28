const coefficients = [
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

function logGamma(value) {
  if (value < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  let x = 0.99999999999980993;
  const z = value - 1;
  for (let index = 0; index < coefficients.length; index += 1) x += coefficients[index] / (z + index + 1);
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(a, b, x) {
  const maxIterations = 200;
  const epsilon = 3e-12;
  const floor = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < floor) d = floor;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < floor) d = floor;
    c = 1 + aa / c;
    if (Math.abs(c) < floor) c = floor;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < floor) d = floor;
    c = 1 + aa / c;
    if (Math.abs(c) < floor) c = floor;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return h;
}

function regularizedBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return factor * betaContinuedFraction(a, b, x) / a;
  return 1 - factor * betaContinuedFraction(b, a, 1 - x) / b;
}

function betaQuantile(probability, a, b) {
  let low = 0;
  let high = 1;
  for (let index = 0; index < 90; index += 1) {
    const midpoint = (low + high) / 2;
    if (regularizedBeta(midpoint, a, b) < probability) low = midpoint;
    else high = midpoint;
  }
  return (low + high) / 2;
}

export function jeffreysRate(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0 || numerator < 0 || numerator > denominator) {
    return { value: null, interval80: [null, null], interval95: [null, null] };
  }
  const a = numerator + 0.5;
  const b = denominator - numerator + 0.5;
  return {
    value: a / (a + b),
    interval80: [betaQuantile(0.1, a, b), betaQuantile(0.9, a, b)],
    interval95: [betaQuantile(0.025, a, b), betaQuantile(0.975, a, b)],
  };
}

const transform = (value, mode) => mode === "log1p" ? Math.log1p(Math.max(0, value)) : value;

export function fixedNormalize(value, bounds) {
  if (!Number.isFinite(value) || !bounds) return null;
  const lower = transform(bounds.lower, bounds.transform);
  const upper = transform(bounds.upper, bounds.transform);
  if (!(upper > lower)) return null;
  const normalized = Math.min(1, Math.max(0, (transform(value, bounds.transform) - lower) / (upper - lower)));
  return (bounds.direction === "lower" ? 1 - normalized : normalized) * 100;
}

export function calculateBalancedModel({ camps, model, observations, referenceBounds }) {
  const observationMap = new Map(observations.map((item) => [`${item.campId}:${item.metricId}`, item]));
  return camps.map((camp) => {
    const domainScores = [];
    for (const domain of model.domains) {
      let eligibleWeight = 0;
      let weightedScore = 0;
      let low80 = 0;
      let high80 = 0;
      let low95 = 0;
      let high95 = 0;
      const inputs = [];
      for (const configured of domain.measures) {
        const observation = observationMap.get(`${camp.id}:${configured.id}`);
        const score = fixedNormalize(observation?.value, referenceBounds[configured.id]);
        if (score === null || (observation.minimumSample && (observation.denominator ?? 0) < observation.minimumSample)) continue;
        const bounds = referenceBounds[configured.id];
        const normalized80 = (observation.interval80 ?? [observation.value, observation.value]).map((value) => fixedNormalize(value, bounds));
        const normalized95 = (observation.interval95 ?? [observation.value, observation.value]).map((value) => fixedNormalize(value, bounds));
        eligibleWeight += configured.weight;
        weightedScore += configured.weight * score;
        low80 += configured.weight * (normalized80[0] ?? score);
        high80 += configured.weight * (normalized80[1] ?? score);
        low95 += configured.weight * (normalized95[0] ?? score);
        high95 += configured.weight * (normalized95[1] ?? score);
        inputs.push({ metricId: configured.id, raw: observation.value, numerator: observation.numerator ?? null, denominator: observation.denominator ?? null, score, weight: configured.weight });
      }
      const coverage = eligibleWeight / domain.measures.reduce((sum, item) => sum + item.weight, 0);
      const sufficient = coverage + 1e-12 >= model.coverageThreshold;
      domainScores.push({
        id: domain.id,
        label: domain.label,
        weight: domain.weight,
        coverage,
        sufficient,
        score: sufficient ? weightedScore / eligibleWeight : null,
        interval80: sufficient ? [low80 / eligibleWeight, high80 / eligibleWeight].sort((a, b) => a - b) : [null, null],
        interval95: sufficient ? [low95 / eligibleWeight, high95 / eligibleWeight].sort((a, b) => a - b) : [null, null],
        inputs,
      });
    }
    const sufficientDomains = domainScores.filter((domain) => domain.sufficient && domain.score !== null);
    const overallWeight = sufficientDomains.reduce((sum, domain) => sum + domain.weight, 0);
    const complete = sufficientDomains.length === model.domains.length && overallWeight > 0;
    const score = complete ? sufficientDomains.reduce((sum, domain) => sum + domain.weight * domain.score, 0) / overallWeight : null;
    const interval80 = complete ? [0, 1].map((index) => sufficientDomains.reduce((sum, domain) => sum + domain.weight * domain.interval80[index], 0) / overallWeight) : [null, null];
    const interval95 = complete ? [0, 1].map((index) => sufficientDomains.reduce((sum, domain) => sum + domain.weight * domain.interval95[index], 0) / overallWeight) : [null, null];
    return { campId: camp.id, score, interval80, interval95, sufficient: complete, reason: complete ? null : "insufficient_coverage", domainScores };
  });
}
