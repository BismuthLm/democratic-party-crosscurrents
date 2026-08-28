import { useMemo } from "react";
import type { AppData } from "../appData";
import type { InspectorSelection } from "../types";
import type { ResearchState } from "../lib/urlState";
import { CoveragePill, EvidenceBadge, SectionHeading, formatNumber } from "./shared";

interface OverviewProps {
  data: AppData;
  state: ResearchState;
  onSelect: (selection: InspectorSelection) => void;
  onView: (view: ResearchState["view"]) => void;
}

export function OverviewView({ data, state, onSelect, onView }: OverviewProps) {
  const visibleDefinitions = data.metricDefinitions.filter((definition) => definition.domain !== "context" && (!state.measures.length || state.measures.includes(definition.id)));
  const observationsInWindow = useMemo(() => data.metricObservations.filter((item) => item.periodEnd >= state.from && (item.periodStart ?? item.periodEnd) <= state.to), [data.metricObservations, state.from, state.to]);
  const observations = useMemo(() => new Map(observationsInWindow.map((item) => [`${item.campId}:${item.metricId}`, item])), [observationsInWindow]);
  const domains = data.modelBundle.model.domains;
  const visibleCamps = data.camps.filter((camp) => !state.camps.length || state.camps.includes(camp.id));
  const contextualEvents = [...data.legacy.events].filter((event) => String(event.date) >= state.from && String(event.date) <= state.to).sort((left, right) => String(right.date).localeCompare(String(left.date))).slice(0, 6);

  return <div className="view-stack">
    <section className="research-card matrix-card domain-matrix-card">
      <SectionHeading eyebrow="PRIMARY SURFACE" title="Faction × domain evidence matrix" description="Cells summarize reviewed observations in the selected date window—not model scores. Missing camps stay visible, and overlapping totals never imply a 100% partition." action={<button type="button" className="quiet-button" onClick={() => onView("model")}>Open secondary Model Lab</button>} />
      <div className="matrix-wrap overview-matrix-wrap"><table className="evidence-matrix domain-matrix"><thead><tr><th>Domain</th>{visibleCamps.map((camp) => <th key={camp.id}><span className="camp-head" style={{ "--camp": camp.color } as React.CSSProperties}>{camp.shortName}</span></th>)}</tr></thead><tbody>{domains.map((domain) => <tr key={domain.id}><th><strong>{domain.label}</strong><small>{visibleDefinitions.filter((definition) => definition.domain === domain.id).length} disclosed measures</small></th>{visibleCamps.map((camp) => {
        const domainDefinitions = visibleDefinitions.filter((definition) => definition.domain === domain.id);
        const domainObservations = domainDefinitions.map((definition) => observations.get(`${camp.id}:${definition.id}`)).filter((item) => item !== undefined);
        const observed = domainObservations.filter((item) => item.value !== null).length;
        const coverage = domainDefinitions.length ? domainObservations.reduce((sum, item) => sum + item.coverage, 0) / domainDefinitions.length : 0;
        const freshness = domainObservations.map((item) => item.freshness).sort().at(-1) ?? null;
        return <td key={camp.id}><button type="button" className="matrix-cell-button" onClick={() => onSelect({ kind: "domain evidence", id: `${camp.id}:${domain.id}`, title: `${camp.name} · ${domain.label}`, subtitle: `${observed} of ${domainDefinitions.length} measures observed in the selected window`, record: { campId: camp.id, domainId: domain.id, observedMeasures: observed, configuredMeasures: domainDefinitions.length, coverage, freshness, observations: domainObservations, attributionMode: state.credit } })}>{domainDefinitions.length === 0 || observed === 0 ? <span className="missing-cell">No reviewed value<small>{Math.round(coverage * 100)}% coverage</small></span> : <span className="domain-score"><strong>{observed}/{domainDefinitions.length}</strong><small>reviewed measures · {freshness ?? "undated"}</small><CoveragePill value={coverage} /></span>}</button></td>;
      })}</tr>)}</tbody></table></div>
      <div className="table-footer"><span>{state.from} to {state.to}</span><span>Model ranks and weights are confined to the secondary Model Lab</span></div>
    </section>

    <div className="overview-columns">
      <section className="research-card metric-ledger-card"><SectionHeading eyebrow="RAW INPUTS" title="Measure ledger" description="Select any cell for its numerator, denominator, 80%/95% interval, method, caveat, and source chain." /><div className="matrix-wrap metric-matrix-wrap"><table className="evidence-matrix metric-matrix"><thead><tr><th>Measure</th>{visibleCamps.map((camp) => <th key={camp.id}>{camp.shortName}</th>)}<th>Freshness</th></tr></thead><tbody>{visibleDefinitions.map((definition) => <tr key={definition.id}><th><strong>{definition.label}</strong><small>{definition.domain} · {definition.methodVersion}</small></th>{visibleCamps.map((camp) => {
        const observation = observations.get(`${camp.id}:${definition.id}`);
        return <td key={camp.id}><button type="button" disabled={!observation} onClick={() => observation && onSelect({ kind: "metric observation", id: observation.id, title: `${definition.label} · ${camp.shortName}`, subtitle: definition.description, record: { ...observation, eligibleUniverse: definition.eligibleUniverse, transformation: definition.transformation, missingDataPolicy: definition.missingDataPolicy, caveat: definition.caveat }, sourceIds: observation.sourceIds })}>{observation ? <span className="metric-value"><strong>{formatNumber(observation.value, definition.format)}</strong>{observation.denominator !== null && <small>{formatNumber(observation.numerator)} / {formatNumber(observation.denominator)}</small>}<EvidenceBadge grade={observation.evidenceGrade} status={observation.reviewStatus} /></span> : <span className="missing-cell">—</span>}</button></td>;
      })}<td>{observationsInWindow.find((item) => item.metricId === definition.id)?.freshness ?? "—"}</td></tr>)}</tbody></table></div>{(state.chamber !== "all" || state.cycles.length < 5 || state.states.length > 0) && <p className="scope-warning">Chamber, cycle, and geography filters apply to entity and election records. These migrated aggregate observations have no defensible subnational denominator and are not silently recomputed.</p>}</section>

      <aside className="overview-rail"><section className="research-card"><SectionHeading eyebrow="CHANGED RECORDS" title="Latest reviewed changes" description="Curated context only; event points never enter balanced-core." />{contextualEvents.map((event, index) => <button type="button" className="change-row" key={`${event.date}-${index}`} onClick={() => onSelect({ kind: "context event", id: `legacy-event-${index}`, title: String(event.title), subtitle: String(event.date), record: event, sourceIds: [`legacy-${String(event.source)}`] })}><time>{String(event.date)}</time><strong>{String(event.title)}</strong><span>{String(event.faction)} · {Number(event.points) > 0 ? "+" : ""}{String(event.points)} legacy points</span></button>)}</section>
      <section className="research-card quality-queue"><SectionHeading eyebrow="DATA QUALITY" title={`${data.quality.reviewQueue.length} release warnings`} description={data.quality.missingDataPolicy} />{data.quality.reviewQueue.map((item) => <button type="button" key={item.id} onClick={() => onSelect({ kind: "quality flag", id: item.id, title: item.message, subtitle: item.status, record: item })}><span className={`severity ${item.severity}`}></span><div><strong>{item.status.replaceAll("_", " ")}</strong><p>{item.message}</p></div></button>)}<button type="button" className="text-link" onClick={() => onView("sources")}>Open Sources & Quality →</button></section></aside>
    </div>
  </div>;
}
