import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppData } from "../appData";
import type { InspectorSelection } from "../types";
import type { ResearchState } from "../lib/urlState";
import { exportCsv, exportJsonl } from "../lib/export";
import { VirtualTable } from "../components/VirtualTable";
import { EvidenceBadge, SectionHeading, formatNumber } from "./shared";

interface ElectionRow {
  id: string;
  candidacyId: string;
  personId: string;
  candidateName: string;
  electionDate: string | null;
  cycle: number;
  chamber: string;
  state: string;
  district: string;
  special: boolean;
  incumbent: boolean | null;
  stage: string;
  votes: number | null;
  share: number | null;
  winner: boolean | null;
  winnerBasis: string;
  markerRaw: string | null;
  outcomeStatus: string;
  advanced: boolean | null;
  partySelected: boolean | null;
  democraticRowLeader: boolean | null;
  margin: number | null;
  denominatorComplete: boolean;
  sourceId: string;
  sourceSheet: string;
  sourceRow: number;
  evidenceGrade: "A" | "B" | "C" | "D";
}

export function ElectionsView({ data, state, onSelect }: { data: AppData; state: ResearchState; onSelect: (selection: InspectorSelection) => void }) {
  const contests = useMemo(() => new Map(data.contests.map((contest) => [contest.id, contest])), [data.contests]);
  const resultsByCandidacy = useMemo(() => {
    const map = new Map<string, typeof data.results>();
    for (const result of data.results) { if (!map.has(result.candidacyId)) map.set(result.candidacyId, []); map.get(result.candidacyId)!.push(result); }
    return map;
  }, [data.results]);
  const campPersonIds = useMemo(() => new Set(data.campRelationships.filter((relationship) => (!state.camps.length || state.camps.includes(relationship.campId)) && (state.evidence === "all" || relationship.evidenceWeight > 0) && (!relationship.cycle || state.cycles.includes(relationship.cycle)) && (relationship.validFrom ?? "0000-01-01") <= state.to && (relationship.validTo ?? "9999-12-31") > state.from).map((relationship) => relationship.personId)), [data.campRelationships, state.camps, state.evidence, state.cycles, state.from, state.to]);
  const organizationPersonIds = useMemo(() => new Set(data.relationships.filter((relationship) => (!state.organization || relationship.organizationId === state.organization) && (state.evidence === "all" || relationship.evidenceGrade !== "D") && (!relationship.cycle || state.cycles.includes(relationship.cycle)) && (relationship.validFrom ?? "0000-01-01") <= state.to && (relationship.validTo ?? "9999-12-31") > state.from).map((relationship) => relationship.personId)), [data.relationships, state.organization, state.evidence, state.cycles, state.from, state.to]);
  const margins = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const contest of data.contests) {
      const rows = data.results.filter((result) => result.contestId === contest.id && result.stage === "primary" && Number.isFinite(result.share)).sort((left, right) => right.share! - left.share!);
      map.set(contest.id, rows.length > 1 ? rows[0].share! - rows[1].share! : null);
    }
    return map;
  }, [data.contests, data.results]);
  const rows = useMemo<ElectionRow[]>(() => data.candidacies.map((candidacy) => {
    const contest = contests.get(candidacy.contestId)!;
    const candidateResults = (resultsByCandidacy.get(candidacy.id) ?? []).sort((left, right) => left.stage === "primary_runoff" ? -1 : 1);
    const result = candidateResults[0];
    return { id: result?.id ?? candidacy.id, candidacyId: candidacy.id, personId: candidacy.personId, candidateName: candidacy.candidateName, electionDate: result?.eventDate ?? contest.electionDate, cycle: contest.cycle, chamber: contest.chamber, state: contest.state, district: contest.district, special: contest.special, incumbent: candidacy.incumbent, stage: result?.stage ?? "primary", votes: result?.votes ?? null, share: result?.share ?? null, winner: result?.winner ?? null, winnerBasis: result?.winnerBasis ?? "unknown", markerRaw: result?.markerRaw ?? null, outcomeStatus: result?.outcomeStatus ?? "unresolved", advanced: result?.advanced ?? null, partySelected: result?.partySelected ?? null, democraticRowLeader: result?.democraticRowLeader ?? null, margin: result?.democraticRowLeader ? margins.get(contest.id) ?? null : null, denominatorComplete: contest.denominatorComplete, sourceId: result?.sourceId ?? contest.sourceId, sourceSheet: result?.sourceSheet ?? contest.sourceSheet, sourceRow: result?.sourceRow ?? candidacy.sourceRows[0]?.row ?? 0, evidenceGrade: result?.evidenceGrade ?? "A" };
  }).filter((row) => {
    if (!state.cycles.includes(row.cycle)) return false;
    if (row.electionDate ? row.electionDate < state.from || row.electionDate > state.to : row.cycle < Number(state.from.slice(0, 4)) || row.cycle > Number(state.to.slice(0, 4))) return false;
    if (state.chamber !== "all" && row.chamber !== state.chamber) return false;
    if (state.states.length && !state.states.includes(row.state)) return false;
    if (state.camps.length && !campPersonIds.has(row.personId)) return false;
    if (state.organization && !organizationPersonIds.has(row.personId)) return false;
    if (state.evidence !== "all" && row.evidenceGrade === "D") return false;
    if (state.incumbency === "incumbent" && row.incumbent !== true) return false;
    if (state.incumbency === "challenger" && row.incumbent === true) return false;
    if (state.completeness === "complete" && !row.denominatorComplete) return false;
    if (state.completeness === "incomplete" && row.denominatorComplete) return false;
    if (state.search && !`${row.candidateName} ${row.state} ${row.chamber} ${row.district}`.toLowerCase().includes(state.search.toLowerCase())) return false;
    return true;
  }), [data.candidacies, contests, resultsByCandidacy, margins, state, campPersonIds, organizationPersonIds]);

  const columns = useMemo<ColumnDef<ElectionRow, unknown>[]>(() => [
    { accessorKey: "candidateName", header: "Candidate", size: 190, cell: ({ row }) => <span className="primary-cell"><strong>{row.original.candidateName}</strong><small>{row.original.incumbent ? "Incumbent" : row.original.incumbent === false ? "Challenger / open seat" : "Incumbency not coded"}</small></span> },
    { accessorKey: "cycle", header: "Cycle", size: 65 },
    { accessorKey: "chamber", header: "Office", size: 76 },
    { id: "seat", accessorFn: (row) => `${row.state}-${row.district}`, header: "State / district", size: 105 },
    { accessorKey: "stage", header: "Stage", size: 105, cell: ({ getValue }) => String(getValue()).replaceAll("_", " ") },
    { accessorKey: "votes", header: "Votes", size: 95, cell: ({ getValue }) => formatNumber(getValue() as number | null) },
    { accessorKey: "share", header: "Share", size: 82, cell: ({ getValue }) => getValue() === null ? "—" : formatNumber(getValue() as number, "percent") },
    { accessorKey: "outcomeStatus", header: "Outcome signal", size: 130, cell: ({ row }) => row.original.advanced ? <span className="winner-label">Advanced</span> : row.original.partySelected ? <span className="complete-label">Party selected</span> : row.original.democraticRowLeader ? "Dem-row leader" : row.original.markerRaw ? `Review ${row.original.markerRaw}` : "Unresolved" },
    { accessorKey: "margin", header: "Dem-row lead", size: 105, cell: ({ getValue }) => getValue() === null ? "—" : `${formatNumber(getValue() as number, "percent")} pts` },
    { accessorKey: "denominatorComplete", header: "Universe", size: 100, cell: ({ row }) => row.original.denominatorComplete ? <span className="complete-label">Complete</span> : <span className="warning-label">Partial</span> },
    { accessorKey: "sourceSheet", header: "Source locator", size: 245, cell: ({ row }) => <span>{row.original.sourceSheet}<small>row {row.original.sourceRow} · <EvidenceBadge grade={row.original.evidenceGrade} /></small></span> },
  ], []);

  const exportRows = rows.map((row) => ({ ...row, sourceUrl: data.sources.find((source) => source.id === row.sourceId)?.canonicalUrl ?? null }));
  return <div className="view-stack"><div className="coverage-grid">{data.quality.coverage.map((coverage) => <article key={coverage.cycle} className={coverage.denominatorEligible ? "eligible" : "ineligible"}><span>{coverage.cycle}</span><strong>{coverage.denominatorEligible ? `${coverage.importedRows?.toLocaleString()} / ${coverage.eligibleDemocraticPrimaryRows?.toLocaleString()}` : "Not denominator-ready"}</strong><p>{coverage.status.replaceAll("_", " ")}</p>{coverage.reason && <small>{coverage.reason}</small>}</article>)}</div>
    <section className="research-card"><SectionHeading eyebrow="COMPLETE OFFICIAL UNIVERSE" title={`${rows.length.toLocaleString()} filtered Democratic candidacy-stage records`} description="The 2018, 2020, and 2022 imports reconcile every eligible official workbook row. 2024 and 2026 remain excluded from national denominators; special-election exact dates remain a visible reconstruction gate." action={<div className="export-group"><button type="button" onClick={() => exportCsv(exportRows, "filtered-democratic-primary-records.csv")}>CSV</button><button type="button" onClick={() => exportJsonl(exportRows, "filtered-democratic-primary-records.jsonl")}>JSONL</button></div>} /><VirtualTable data={rows} columns={columns} height={590} estimateRowHeight={42} ariaLabel="Federal Democratic primary results" onSelect={(row) => onSelect({ kind: "election result", id: row.candidacyId, title: row.candidateName, subtitle: `${row.cycle} ${row.state}-${row.district} ${row.chamber} ${row.stage.replaceAll("_", " ")}`, record: row as unknown as Record<string, unknown>, sourceIds: [row.sourceId] })} />{data.contests.some((contest) => contest.electionDate === null) && <p className="scope-warning">Exact contest dates are not yet reconstructed for this official compilation. Date filters fall back to cycle year for undated rows and must not be interpreted as day-level selection.</p>}</section>
    <section className="research-card interpretation-note"><strong>Outcome rule</strong><p>A row can say “Unopposed” while numeric votes remain null; that is never converted to zero. FEC W, *, #, and W# markers are preserved as advancement, party-selection, or footnote-review signals. No marker becomes a nomination win until the contest system and final stage are reviewed.</p></section>
  </div>;
}
