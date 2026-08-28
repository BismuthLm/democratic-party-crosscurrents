export type EvidenceGrade = "A" | "B" | "C" | "D";
export type ViewId = "overview" | "compare" | "people" | "elections" | "money" | "institutions" | "model" | "sources";
export type CreditMode = "full" | "confidence_weighted" | "split_credit";

export interface ReleasePointer {
  releaseId: string;
  manifest: string;
  manifestSha256: string;
  generatedOn: string;
  reviewedThrough: string;
}

export interface ReleaseManifest {
  releaseId: string;
  title: string;
  scope: string;
  schemaVersion: string;
  methodVersion: string;
  generatedOn: string;
  reviewedThrough: string;
  buildCommit: string;
  immutable: boolean;
  attributionModes: CreditMode[];
  partitions: Array<{ path: string; rowCount: number; bytes: number; sha256: string }>;
  downloads: Array<{ path: string; bytes: number; sha256: string }>;
  corrections: string[];
}

export interface Camp {
  id: string;
  name: string;
  shortName: string;
  color: string;
  definition: string;
  ruleVersion: string;
  overlapping: boolean;
}

export interface Organization {
  id: string;
  name: string;
  shortName: string;
  type: string;
  officialUrl: string;
}

export interface Person {
  id: string;
  name: string;
  actualParty: string;
  bioguideId: string | null;
  fecCandidateId: string | null;
  currentCampIds: string[];
  source: string;
  identityStatus: "reviewed_crosswalk" | "official_fec_candidate_id" | "unresolved_fec_candidate_id" | "conflicting_fec_candidate_id";
  identityReason: string | null;
}

export interface Relationship {
  id: string;
  personId: string;
  organizationId: string;
  type: string;
  program?: string;
  role?: string;
  cycle?: number;
  validFrom: string | null;
  validTo: string | null;
  sourceDate: string | null;
  observedAt: string;
  supersededAt: string | null;
  evidenceGrade: EvidenceGrade;
  reviewStatus: string;
  reviewer: string;
  rationale: string;
  locator: string;
}

export interface CampRelationship {
  id: string;
  personId: string;
  campId: string;
  type: "derived_camp";
  validFrom: string | null;
  validTo: string | null;
  cycle: number | null;
  sourceDate: string | null;
  observedAt: string;
  evidenceGrade: "C";
  evidenceWeight: number;
  reviewStatus: string;
  rationale: string;
  sourceRelationshipIds: string[];
}

export interface Contest {
  id: string;
  cycle: number;
  sourceCycles: number[];
  eventYear: number;
  electionDate: string | null;
  primaryDate: string | null;
  runoffDate: string | null;
  generalDate: string | null;
  dateStatus: string;
  chamber: "House" | "Senate";
  state: string;
  stateName: string;
  district: string;
  termClass: string;
  special: boolean;
  stageUniverse: string;
  certificationStatus: string;
  denominatorComplete: boolean;
  sourceId: string;
  sourceIds: string[];
  sourceSheet: string;
}

export interface Candidacy {
  id: string;
  contestId: string;
  personId: string;
  fecCandidateId: string | null;
  fecCandidateIdRaw: string | null;
  identityStatus: "official_fec_candidate_id" | "unresolved_fec_candidate_id" | "conflicting_fec_candidate_id";
  identityReason: string | null;
  candidateName: string;
  party: string;
  incumbent: boolean | null;
  ballotStatus: string;
  primaryWinner: boolean | null;
  advanced: boolean | null;
  partySelected: boolean | null;
  sourceRows: Array<{ cycle: number; sheet: string; row: number }>;
  sourceObservationIds: string[];
  ballotLines: Array<{ sourceObservationId: string; party: string; rowRole: string }>;
}

export interface ElectionResult {
  id: string;
  contestId: string;
  candidacyId: string;
  personId: string;
  stage: "primary" | "primary_runoff";
  votes: number | null;
  votesRaw: string | null;
  share: number | null;
  shareRaw: string | null;
  winner: boolean | null;
  winnerBasis: string;
  markerRaw: string | null;
  outcomeStatus: string;
  advanced: boolean | null;
  partySelected: boolean | null;
  democraticRowLeader: boolean | null;
  eventDate: string | null;
  sourceCycle: number;
  sourceObservationId: string;
  sourceObservationIds: string[];
  sourceRows: Array<{ cycle: number; sheet: string; row: number }>;
  sourceId: string;
  documentId: string;
  sourceSheet: string;
  sourceRow: number;
  observedAt: string;
  evidenceGrade: EvidenceGrade;
  reviewStatus: string;
}

export interface MetricDefinition {
  id: string;
  label: string;
  domain: string;
  description: string;
  numerator: string;
  denominator: string | null;
  eligibleUniverse: string;
  direction: string;
  transformation: string;
  window: string;
  minimumSample: number;
  coverageThreshold: number;
  missingDataPolicy: string;
  methodVersion: string;
  format: string;
  legacyIncluded: boolean;
  scoreEligible: boolean;
  caveat: string;
  sourceIds: string[];
}

export interface MetricObservation {
  id: string;
  metricId: string;
  campId: string;
  periodStart: string | null;
  periodEnd: string;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  interval80: [number | null, number | null] | null;
  interval95: [number | null, number | null] | null;
  coverage: number;
  freshness: string;
  evidenceGrade: EvidenceGrade;
  reviewStatus: string;
  methodVersion: string;
  minimumSample?: number;
  sourceIds: string[];
  caveat: string;
}

export interface DomainScore {
  id: string;
  label: string;
  weight: number;
  coverage: number;
  sufficient: boolean;
  score: number | null;
  interval80: [number | null, number | null];
  interval95: [number | null, number | null];
  inputs: Array<{ metricId: string; raw: number; numerator: number | null; denominator: number | null; score: number; weight: number }>;
}

export interface ModelScore {
  campId: string;
  score: number | null;
  rank?: number;
  interval80: [number | null, number | null];
  interval95: [number | null, number | null];
  sufficient: boolean;
  reason: string | null;
  domainScores: DomainScore[];
  leaveOneMetricOut: Array<{ metricId: string; score: number | null; sufficient: boolean }>;
  weightSensitivity: Array<{ domainId: string; multiplier: number; score: number | null; sufficient: boolean }>;
  attributionSensitivity: Array<{ mode: CreditMode; score: number | null; note: string }>;
}

export interface ModelBundle {
  model: { id: string; label: string; coverageThreshold: number; referencePeriod: string; domains: Array<{ id: string; label: string; weight: number; measures: Array<{ id: string; weight: number }> }> };
  referenceDistribution: { id: string; status: string; targetPeriod: string; observedPeriod: string; method: string; acceptanceEligible: boolean };
  referenceBounds: Record<string, { lower: number; upper: number; transform: string; direction: string }>;
  scores: ModelScore[];
}

export interface SourceRecord {
  id: string;
  publisher: string;
  title: string;
  canonicalUrl: string;
  kind: string;
  license: string;
  publicationDate: string | null;
  retrievedAt: string;
  reviewStatus: string;
}

export interface EvidenceRecord {
  id: string;
  factType: string;
  factId: string;
  sourceId: string | null;
  documentId: string | null;
  locator: string;
  evidenceGrade: EvidenceGrade;
  reviewStatus: string;
  rationale: string;
  inputFactIds?: string[];
}

export interface CoverageRecord {
  cycle: number;
  scope: string;
  status: string;
  denominatorEligible: boolean;
  reason?: string;
  sourceUrl?: string;
  observedAt?: string;
  eligibleDemocraticPrimaryRows?: number;
  importedRows?: number;
  importRate?: number;
}

export interface QualityBundle {
  releaseId: string;
  schemaVersion: string;
  methodVersion: string;
  reviewedThrough: string;
  counts: Record<string, number>;
  coverage: CoverageRecord[];
  reviewQueue: Array<{ id: string; severity: string; status: string; message: string }>;
  exclusions: string[];
  missingDataPolicy: string;
}

export interface LegacyContext {
  schema: string;
  archivedAt: string;
  meta: Record<string, unknown>;
  factions: unknown[];
  overlaps: unknown[];
  primaryRaces: Array<Record<string, unknown>>;
  financeRaces: Array<Record<string, unknown>>;
  publicIndicators: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  measureCatalogue: Record<string, unknown>;
  history: Array<Record<string, unknown>>;
}

export interface InspectorSelection {
  kind: string;
  id: string;
  title: string;
  subtitle?: string;
  record: Record<string, unknown>;
  evidenceIds?: string[];
  sourceIds?: string[];
}
