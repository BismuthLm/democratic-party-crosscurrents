import { useMemo } from "react";
import type { AppData } from "../appData";
import type { InspectorSelection } from "../types";
import type { ResearchState } from "../lib/urlState";
import { CoveragePill, SectionHeading, formatNumber } from "./shared";
import { ResearchChart } from "../components/ResearchChart";

export function CompareView({ data, state, onState, onSelect }: { data: AppData; state: ResearchState; onState: (patch: Partial<ResearchState>) => void; onSelect: (selection: InspectorSelection) => void }) {
  const selectedIds = state.camps.length ? state.camps : data.camps.map((camp) => camp.id);
  const selectedCamps = data.camps.filter((camp) => selectedIds.includes(camp.id));
  const scoreByCamp = new Map(data.modelBundle.scores.map((score) => [score.campId, score]));
  const domains = data.modelBundle.model.domains;
  const modelScopeChanged = state.from !== "2018-01-01" || state.to < data.manifest.reviewedThrough || state.chamber !== "all" || state.states.length > 0 || state.cycles.length < 5;
  const chartOption = useMemo(() => ({
    animation: false,
    color: selectedCamps.map((camp) => camp.color),
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { fontSize: 10 } },
    radar: { radius: "62%", center: ["50%", "43%"], splitNumber: 4, indicator: domains.map((domain) => ({ name: domain.label, max: 100 })), axisName: { fontSize: 9, color: "#4f5964" }, splitArea: { areaStyle: { color: ["#fafbfc", "#f2f4f6"] } } },
    series: [{ type: "radar", symbolSize: 4, connectNulls: false, data: selectedCamps.map((camp) => ({ name: camp.shortName, value: domains.map((domain) => scoreByCamp.get(camp.id)?.domainScores.find((item) => item.id === domain.id)?.score ?? null), areaStyle: { opacity: 0.06 } })) }],
  }), [selectedCamps, domains, scoreByCamp]);

  return <div className="view-stack"><section className="research-card"><SectionHeading eyebrow="COHORT PIVOT" title="Compare camps across the same domains" description="Missing coverage is shown as missing, not converted into a zero. Select camps to change the shared URL state." /><div className="camp-toggle-grid">{data.camps.map((camp) => <label key={camp.id} style={{ "--camp": camp.color } as React.CSSProperties}><input type="checkbox" checked={selectedIds.includes(camp.id)} onChange={() => { const next = selectedIds.includes(camp.id) ? selectedIds.filter((id) => id !== camp.id) : [...selectedIds, camp.id]; onState({ camps: next.length === data.camps.length ? [] : next }); }} /><span></span>{camp.name}</label>)}</div>{modelScopeChanged && <p className="scope-warning">The released balanced-core scores use the fixed 2018–present reference scope. Your narrower date, chamber, cycle, or geography filters are not applied to this model comparison; use the evidence and election views for those cuts.</p>}</section>
    <div className="compare-grid"><section className="research-card chart-card"><SectionHeading eyebrow="LINKED VIEW" title="Domain shape" description="Scores are fixed-bound descriptive comparisons; hover for the selected camp and domain." /><ResearchChart option={chartOption} height={420} onEvents={{ click: ((params: { seriesName?: string; name?: string; value?: number[] }) => onSelect({ kind: "comparison chart", id: String(params.name ?? "domain-shape"), title: String(params.name ?? "Domain comparison"), record: params as unknown as Record<string, unknown> })) as (params: never) => void }} /></section>
    <section className="research-card comparison-table-card"><SectionHeading eyebrow="TABLE" title="Coverage-aware comparison" description="Each domain exposes its score, interval, and configured coverage." /><div className="comparison-table"><div className="comparison-row header"><strong>Camp</strong>{domains.map((domain) => <strong key={domain.id}>{domain.label}</strong>)}<strong>Overall</strong></div>{selectedCamps.map((camp) => { const score = scoreByCamp.get(camp.id)!; return <button type="button" className="comparison-row" key={camp.id} onClick={() => onSelect({ kind: "model result", id: camp.id, title: camp.name, subtitle: score.sufficient ? `Rank ${score.rank}` : "Insufficient coverage", record: score as unknown as Record<string, unknown> })}><span><i style={{ background: camp.color }}></i><strong>{camp.shortName}</strong></span>{domains.map((domain) => { const item = score.domainScores.find((entry) => entry.id === domain.id)!; return <span key={domain.id}>{item.score === null ? <em>Insufficient<CoveragePill value={item.coverage} /></em> : <><strong>{item.score.toFixed(1)}</strong><small>{formatNumber(item.interval80[0])}–{formatNumber(item.interval80[1])}</small></>}</span>; })}<span>{score.score === null ? <em>Not scored</em> : <><strong>{score.score.toFixed(1)}</strong><small>rank {score.rank}</small></>}</span></button>; })}</div></section></div>
    <section className="research-card interpretation-note"><strong>How to read this</strong><p>The radar is a shape comparison, not an area-based winner chart. Movement-left and party-network records remain visible even where the balanced model lacks complete institutional or money inputs. Attribution mode is <b>{state.credit.replaceAll("_", " ")}</b>; aggregate legacy inputs do not change across modes, while person-level network counts do.</p></section>
  </div>;
}
