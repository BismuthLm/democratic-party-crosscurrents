import { useMemo } from "react";
import type { AppData } from "../appData";
import type { InspectorSelection } from "../types";
import type { ResearchState } from "../lib/urlState";
import { EvidenceBadge, SectionHeading, formatNumber } from "./shared";
import { ResearchChart } from "../components/ResearchChart";

export function MoneyView({ data, state, onSelect }: { data: AppData; state: ResearchState; onSelect: (selection: InspectorSelection) => void }) {
  const visibleObservations = data.metricObservations.filter((observation) => observation.periodEnd >= state.from && (observation.periodStart ?? observation.periodEnd) <= state.to);
  const camps = data.camps.filter((camp) => (!state.camps.length || state.camps.includes(camp.id)) && visibleObservations.some((observation) => observation.campId === camp.id && data.metricDefinitions.find((definition) => definition.id === observation.metricId)?.domain === "money"));
  const definitions = data.metricDefinitions.filter((definition) => definition.domain === "money" && (!state.measures.length || state.measures.includes(definition.id)));
  const observations = new Map(visibleObservations.map((observation) => [`${observation.campId}:${observation.metricId}`, observation]));
  const keyDefinitions = definitions.filter((definition) => ["pac_receipts_monthly", "individual_contribution_share", "candidate_contributions", "cash_on_hand", "receipts_per_member"].includes(definition.id));
  const chartOption = useMemo(() => ({
    animation: false,
    color: camps.map((camp) => camp.color),
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0, textStyle: { fontSize: 10 } },
    grid: { left: 155, right: 24, top: 50, bottom: 36 },
    xAxis: { type: "value", axisLabel: { formatter: (value: number) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(value), fontSize: 9 }, splitLine: { lineStyle: { color: "#e5e8ec" } } },
    yAxis: { type: "category", data: keyDefinitions.filter((definition) => definition.format === "currency").map((definition) => definition.label), axisLabel: { fontSize: 9, width: 140, overflow: "truncate" } },
    series: camps.map((camp) => ({ name: camp.shortName, type: "bar", barMaxWidth: 13, data: keyDefinitions.filter((definition) => definition.format === "currency").map((definition) => observations.get(`${camp.id}:${definition.id}`)?.value ?? null) })),
  }), [camps, keyDefinitions, observations]);
  const financeCases = (data.legacy.financeRaces as Array<Record<string, unknown>>).filter((record) => String(record.date) >= state.from && String(record.date) <= state.to && (!state.search || JSON.stringify(record).toLowerCase().includes(state.search.toLowerCase())));

  return <div className="view-stack"><section className="research-card chart-card"><SectionHeading eyebrow="PAC AND CANDIDATE SUPPORT" title="Resource scale without a destiny claim" description="Raw dollar observations are shown for the selected camp and date window; balanced-core applies a documented log1p transform before comparison." /><ResearchChart option={chartOption} height={390} />{(state.chamber !== "all" || state.states.length > 0) && <p className="scope-warning">PAC aggregate filings have no chamber or state denominator. Those filters are not applied to this chart.</p>}</section>
    <section className="research-card"><SectionHeading eyebrow="MEASURE TABLE" title="Finance observations and caveats" description="Unitemized receipts remain a reporting category, not a count of unique small donors. Missing values remain null." /><div className="matrix-wrap"><table className="evidence-matrix money-matrix"><thead><tr><th>Measure</th>{camps.map((camp) => <th key={camp.id}>{camp.shortName}</th>)}<th>Method</th></tr></thead><tbody>{definitions.map((definition) => <tr key={definition.id}><th><strong>{definition.label}</strong><small>{definition.description}</small></th>{camps.map((camp) => { const observation = observations.get(`${camp.id}:${definition.id}`); return <td key={camp.id}><button type="button" disabled={!observation} onClick={() => observation && onSelect({ kind: "money observation", id: observation.id, title: `${definition.label} · ${camp.shortName}`, subtitle: definition.caveat, record: { ...observation, eligibleUniverse: definition.eligibleUniverse, transformation: definition.transformation }, sourceIds: observation.sourceIds })}>{observation ? <span className="metric-value"><strong>{formatNumber(observation.value, definition.format)}</strong><EvidenceBadge grade={observation.evidenceGrade} /></span> : "—"}</button></td>; })}<td><strong>{definition.transformation}</strong><small>{definition.scoreEligible ? "balanced-core eligible" : "context only"}</small></td></tr>)}</tbody></table></div></section>
    <section className="research-card"><SectionHeading eyebrow="CONTEXTUAL CASES" title={`${financeCases.length} migrated race finance comparisons`} description="These selected cases are preserved for research context and are not treated as a complete race universe or scored domain." /><div className="case-grid">{financeCases.map((record, index) => { const winnerReceipts = typeof record.winnerReceipts === "number" ? record.winnerReceipts : null; const opponentReceipts = typeof record.opponentReceipts === "number" ? record.opponentReceipts : null; return <button type="button" key={`${String(record.race)}-${index}`} onClick={() => onSelect({ kind: "finance case", id: `legacy-finance-${index}`, title: String(record.race), subtitle: String(record.status), record, sourceIds: (record.sources as string[]).map((source) => `legacy-${source}`) })}><span>{String(record.date)}</span><h3>{String(record.winner)} over {String(record.opponent)}</h3><div><strong>{formatNumber(winnerReceipts, "currency")}</strong><small>winner receipts</small><strong>{formatNumber(opponentReceipts, "currency")}</strong><small>opponent receipts</small></div><p>{String(record.status)}</p></button>; })}</div></section>
  </div>;
}
