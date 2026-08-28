import type { Camp, EvidenceGrade, MetricDefinition, MetricObservation } from "../types";

export const campById = (camps: Camp[]) => new Map(camps.map((camp) => [camp.id, camp]));
export const definitionById = (definitions: MetricDefinition[]) => new Map(definitions.map((definition) => [definition.id, definition]));

export function formatNumber(value: number | null | undefined, format = "number") {
  if (!Number.isFinite(value)) return "—";
  if (format === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(value!);
  if (format === "percent") return `${value!.toFixed(Math.abs(value! % 1) > 0.001 ? 1 : 0)}%`;
  if (format === "rate") return `${(value! * 100).toFixed(1)}%`;
  return new Intl.NumberFormat("en-US", { notation: Math.abs(value!) >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value!);
}

export const gradeWeight = (grade: EvidenceGrade) => ({ A: 1, B: 0.8, C: 1, D: 0 })[grade];

export function EvidenceBadge({ grade, status }: { grade: EvidenceGrade; status?: string }) {
  return <span className={`grade grade-${grade.toLowerCase()}`} title={status}>{grade}</span>;
}

export function observationLabel(observation: MetricObservation, definition: MetricDefinition) {
  const base = formatNumber(observation.value, definition.format);
  if (observation.denominator !== null && observation.denominator !== undefined) return `${base} · n=${formatNumber(observation.denominator)}`;
  return base;
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

export function CoveragePill({ value }: { value: number }) {
  const status = value >= 0.999 ? "complete" : value >= 0.7 ? "usable" : "insufficient";
  return <span className={`coverage-pill ${status}`}>{Math.round(value * 100)}% {status}</span>;
}
