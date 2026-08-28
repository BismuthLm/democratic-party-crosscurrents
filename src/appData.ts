import type { Camp, CampRelationship, Candidacy, Contest, ElectionResult, EvidenceRecord, LegacyContext, MetricDefinition, MetricObservation, ModelBundle, Organization, Person, QualityBundle, Relationship, ReleaseManifest, ReleasePointer, SourceRecord } from "./types";

export interface AppData {
  pointer: ReleasePointer;
  manifest: ReleaseManifest;
  camps: Camp[];
  organizations: Organization[];
  people: Person[];
  relationships: Relationship[];
  campRelationships: CampRelationship[];
  contests: Contest[];
  candidacies: Candidacy[];
  results: ElectionResult[];
  metricDefinitions: MetricDefinition[];
  metricObservations: MetricObservation[];
  modelBundle: ModelBundle;
  sources: SourceRecord[];
  evidence: EvidenceRecord[];
  quality: QualityBundle;
  legacy: LegacyContext;
}
