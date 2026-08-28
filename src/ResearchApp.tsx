import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { AppData } from "./appData";
import type { InspectorSelection, ViewId } from "./types";
import { loadPartition, loadRelease } from "./lib/data";
import { defaultResearchState, parseResearchState, replaceUrlState, type ResearchState } from "./lib/urlState";
import { workspaceCounts, workspaceDb, type CampOverride, type SavedView } from "./lib/workspace";
import { Inspector } from "./components/Inspector";
import { WorkspacePanel } from "./components/WorkspacePanel";

const OverviewView = lazy(() => import("./views/OverviewView").then((module) => ({ default: module.OverviewView })));
const CompareView = lazy(() => import("./views/CompareView").then((module) => ({ default: module.CompareView })));
const PeopleView = lazy(() => import("./views/PeopleView").then((module) => ({ default: module.PeopleView })));
const ElectionsView = lazy(() => import("./views/ElectionsView").then((module) => ({ default: module.ElectionsView })));
const MoneyView = lazy(() => import("./views/MoneyView").then((module) => ({ default: module.MoneyView })));
const InstitutionsView = lazy(() => import("./views/InstitutionsView").then((module) => ({ default: module.InstitutionsView })));
const ModelView = lazy(() => import("./views/ModelView").then((module) => ({ default: module.ModelView })));
const SourcesView = lazy(() => import("./views/SourcesView").then((module) => ({ default: module.SourcesView })));

const nav: Array<{ id: ViewId; label: string; group: "research" | "audit" }> = [
  { id: "overview", label: "Overview", group: "research" },
  { id: "compare", label: "Compare", group: "research" },
  { id: "people", label: "People & Networks", group: "research" },
  { id: "elections", label: "Elections", group: "research" },
  { id: "money", label: "Money", group: "research" },
  { id: "institutions", label: "Institutions & Votes", group: "research" },
  { id: "model", label: "Model Lab", group: "audit" },
  { id: "sources", label: "Sources & Quality", group: "audit" },
];

const viewDescription: Record<ViewId, string> = {
  overview: "Raw values, denominators, uncertainty, coverage, and freshness across overlapping analytical camps.",
  compare: "Linked camp comparisons across common domains, cohorts, and attribution modes.",
  people: "Candidate identities, observed organizational relationships, derived camps, and network overlays.",
  elections: "Complete official FEC Democratic federal primary universes where the denominator is available.",
  money: "PAC resources, donor-category measures, candidate support, and selected contextual race cases.",
  institutions: "Formal caucus scale, leadership roles, committee reach, and staged roll-call dimensions.",
  model: "A documented balanced model with coverage gates, intervals, and robustness tests.",
  sources: "Release provenance, source-to-claim lookup, completeness, licences, and downloadable data.",
};

async function loadAppData(): Promise<AppData> {
  const { pointer, manifest } = await loadRelease();
  const [organizations, camps, people, relationships, campRelationships, contests, candidacies, results, metricDefinitions, metricObservations, modelBundle, sources, evidence, quality, legacy] = await Promise.all([
    loadPartition<AppData["organizations"]>(manifest, "entities/organizations.json"),
    loadPartition<AppData["camps"]>(manifest, "entities/camps.json"),
    loadPartition<AppData["people"]>(manifest, "entities/people.json"),
    loadPartition<AppData["relationships"]>(manifest, "facts/relationships.json"),
    loadPartition<AppData["campRelationships"]>(manifest, "facts/camp-derivations.json"),
    loadPartition<AppData["contests"]>(manifest, "facts/contests.json"),
    loadPartition<AppData["candidacies"]>(manifest, "facts/candidacies.json"),
    loadPartition<AppData["results"]>(manifest, "facts/election-results.json"),
    loadPartition<AppData["metricDefinitions"]>(manifest, "metrics/definitions.json"),
    loadPartition<AppData["metricObservations"]>(manifest, "metrics/observations.json"),
    loadPartition<AppData["modelBundle"]>(manifest, "metrics/balanced-core-v1.json"),
    loadPartition<AppData["sources"]>(manifest, "sources/sources.json"),
    loadPartition<AppData["evidence"]>(manifest, "sources/evidence.json"),
    loadPartition<AppData["quality"]>(manifest, "quality/coverage.json"),
    loadPartition<AppData["legacy"]>(manifest, "context/legacy-v2.1.json"),
  ]);
  return { pointer, manifest, organizations, camps, people, relationships, campRelationships, contests, candidacies, results, metricDefinitions, metricObservations, modelBundle, sources, evidence, quality, legacy };
}

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState("");
  const [state, setState] = useState<ResearchState>(() => typeof window === "undefined" ? defaultResearchState : parseResearchState());
  const [selection, setSelection] = useState<InspectorSelection | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [localOverrides, setLocalOverrides] = useState<CampOverride[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { loadAppData().then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load the research release.")); }, []);
  const refreshWorkspace = useCallback(async () => {
    try {
      const [counts, views, overrides] = await Promise.all([workspaceCounts(), workspaceDb.savedViews.orderBy("updatedAt").reverse().toArray(), workspaceDb.campOverrides.toArray()]);
      setLocalCounts(counts); setSavedViews(views); setLocalOverrides(overrides); setWorkspaceRevision((revision) => revision + 1);
    } catch {
      setLocalCounts({}); setSavedViews([]); setLocalOverrides([]);
    }
  }, []);
  useEffect(() => { void refreshWorkspace(); }, [refreshWorkspace]);
  useEffect(() => {
    const onPop = () => setState(parseResearchState());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!data) return;
    setState((current) => {
      const campIds = new Set(data.camps.map((item) => item.id));
      const organizationIds = new Set(data.organizations.map((item) => item.id));
      const stateIds = new Set(data.contests.map((item) => item.state));
      const measureIds = new Set(data.metricDefinitions.map((item) => item.id));
      const domainIds = new Set(data.modelBundle.model.domains.map((item) => item.id));
      const next = {
        ...current,
        to: typeof window !== "undefined" && !new URLSearchParams(window.location.search).has("to") && current.to === defaultResearchState.to ? data.manifest.generatedOn : current.to,
        camps: current.camps.filter((id) => campIds.has(id)),
        states: current.states.filter((id) => stateIds.has(id)),
        organization: organizationIds.has(current.organization) ? current.organization : "",
        measures: current.measures.filter((id) => measureIds.has(id)),
        model: current.model === data.modelBundle.model.id ? current.model : data.modelBundle.model.id,
        modelWeights: Object.fromEntries(Object.entries(current.modelWeights).filter(([id, value]) => domainIds.has(id) && Number.isFinite(value) && value >= 0 && value <= 100)),
      };
      if (JSON.stringify(next) === JSON.stringify(current)) return current;
      replaceUrlState(next);
      return next;
    });
  }, [data]);

  const updateState = useCallback((patch: Partial<ResearchState>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      replaceUrlState(next);
      return next;
    });
  }, []);
  const openView = useCallback((view: ViewId) => { updateState({ view }); setSelection(null); }, [updateState]);
  const totalLocal = Object.values(localCounts).reduce((sum, value) => sum + value, 0);
  const states = useMemo(() => data ? [...new Set(data.contests.map((contest) => contest.state).filter(Boolean))].sort() : [], [data]);

  if (error) return <main className="fatal-screen"><span>RELEASE LOAD ERROR</span><h1>The research bundle could not be opened.</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></main>;
  if (!data) return <main className="loading-screen"><div className="loading-mark">DF</div><span>Opening immutable research release</span><strong>Loading evidence partitions…</strong><div><i></i></div></main>;

  const view = (() => {
    const common = { data, state, onSelect: setSelection };
    if (state.view === "overview") return <OverviewView {...common} onView={openView} />;
    if (state.view === "compare") return <CompareView {...common} onState={updateState} />;
    if (state.view === "people") return <PeopleView {...common} localOverrides={localOverrides} />;
    if (state.view === "elections") return <ElectionsView {...common} />;
    if (state.view === "money") return <MoneyView data={data} state={state} onSelect={setSelection} />;
    if (state.view === "institutions") return <InstitutionsView data={data} state={state} onSelect={setSelection} />;
    if (state.view === "model") return <ModelView {...common} onState={updateState} />;
    return <SourcesView {...common} />;
  })();

  return <div className="workbench research-workbench">
    <a className="skip-link" href="#research-main">Skip to research view</a>
    <header className="topbar">
      <button className="brand-lockup brand-button" type="button" onClick={() => openView("overview")}><span className="brand-glyph">DF</span><div><strong>Democratic Faction</strong><small>Research Workbench</small></div></button>
      <div className="release-chip"><span>Release</span><strong>{data.manifest.releaseId}</strong></div>
      <label className="global-search"><span>⌕</span><input type="search" value={state.search} onChange={(event) => updateState({ search: event.target.value })} aria-label="Search the active research view" placeholder="Search people, races, sources, or evidence…" /></label>
      <label className="saved-view-select"><span>Saved view</span><select value="" onChange={(event) => { const saved = savedViews.find((item) => item.id === event.target.value); if (saved) updateState(saved.state as unknown as Partial<ResearchState>); }}><option value="">{savedViews.length ? `${savedViews.length} local` : "None"}</option>{savedViews.map((saved) => <option key={saved.id} value={saved.id}>{saved.name}</option>)}</select></label>
      <button className={`workspace-button${totalLocal ? " active" : ""}`} type="button" onClick={() => setWorkspaceOpen(true)}><span>{localCounts.campOverrides ? "Workspace changes active" : totalLocal ? "Private workspace saved" : "Workspace clean"}</span><strong>{localCounts.campOverrides ? `${localCounts.campOverrides} overlays` : totalLocal ? `${totalLocal} records` : "Local + exportable"}</strong></button>
      <button className="primary-button" type="button" onClick={() => openView("sources")}>Export data</button>
    </header>

    <aside className="sidebar" aria-label="Research views">
      <div className="sidebar-section"><span>RESEARCH</span>{nav.filter((item) => item.group === "research").map((item) => <button key={item.id} type="button" className={state.view === item.id ? "active" : ""} onClick={() => openView(item.id)}>{item.label}</button>)}</div>
      <div className="sidebar-section audit"><span>METHOD & AUDIT</span>{nav.filter((item) => item.group === "audit").map((item) => <button key={item.id} type="button" className={state.view === item.id ? "active" : ""} onClick={() => openView(item.id)}>{item.label}</button>)}</div>
      <div className="sidebar-note"><strong>Reviewed base release</strong><span>{data.quality.counts.people.toLocaleString()} people</span><span>{data.quality.counts.candidacies.toLocaleString()} candidacies</span><span>{data.quality.counts.sources} sources</span><span>Generated {data.manifest.generatedOn}</span></div>
    </aside>

    <main id="research-main" className="main-panel">
      <section className="view-heading"><div><span className="eyebrow">2018–PRESENT · FEDERAL RESEARCH CORE</span><h1>{nav.find((item) => item.id === state.view)?.label}</h1><p>{viewDescription[state.view]}</p></div><div className="freshness"><span>Reviewed through</span><strong>{data.manifest.reviewedThrough}</strong><small>{data.quality.reviewQueue.length} visible quality warnings</small></div></section>
      <section className="filterbar" aria-label="Persistent research filters">
        <label>From<input type="date" value={state.from} max={state.to} onChange={(event) => updateState({ from: event.target.value })} /></label>
        <label>To<input type="date" value={state.to} min={state.from} onChange={(event) => updateState({ to: event.target.value })} /></label>
        <label>Chamber<select value={state.chamber} onChange={(event) => updateState({ chamber: event.target.value as ResearchState["chamber"] })}><option value="all">House + Senate</option><option value="House">House</option><option value="Senate">Senate</option></select></label>
        <label>Cycle<select value={state.cycles.length === 1 ? state.cycles[0] : "all"} onChange={(event) => updateState({ cycles: event.target.value === "all" ? [2018, 2020, 2022, 2024, 2026] : [Number(event.target.value)] })}><option value="all">All cycles</option>{[2018, 2020, 2022, 2024, 2026].map((cycle) => <option key={cycle} value={cycle}>{cycle}</option>)}</select></label>
        <label>Camp<select value={state.camps.length === 1 ? state.camps[0] : "all"} onChange={(event) => updateState({ camps: event.target.value === "all" ? [] : [event.target.value] })}><option value="all">All overlapping camps</option>{data.camps.map((camp) => <option key={camp.id} value={camp.id}>{camp.shortName}</option>)}</select></label>
        <label>Evidence<select value={state.evidence} onChange={(event) => updateState({ evidence: event.target.value as ResearchState["evidence"] })}><option value="reviewed">Reviewed A–C</option><option value="all">Include disputed D</option></select></label>
        <button type="button" className={filtersOpen ? "active" : ""} onClick={() => setFiltersOpen(!filtersOpen)}>More filters <span>{[state.states.length, state.incumbency !== "all", state.completeness !== "all", Boolean(state.organization), state.credit !== "full"].filter(Boolean).length}</span></button>
      </section>
      {filtersOpen && <section className="expanded-filters"><label>State<select value={state.states.length === 1 ? state.states[0] : "all"} onChange={(event) => updateState({ states: event.target.value === "all" ? [] : [event.target.value] })}><option value="all">All states</option>{states.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Incumbency<select value={state.incumbency} onChange={(event) => updateState({ incumbency: event.target.value as ResearchState["incumbency"] })}><option value="all">All</option><option value="incumbent">Incumbents</option><option value="challenger">Challengers / open</option></select></label><label>Completeness<select value={state.completeness} onChange={(event) => updateState({ completeness: event.target.value as ResearchState["completeness"] })}><option value="all">All records</option><option value="complete">Complete denominators</option><option value="incomplete">Incomplete only</option></select></label><label>Organization<select value={state.organization} onChange={(event) => updateState({ organization: event.target.value })}><option value="">All observed organizations</option>{data.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.shortName}</option>)}</select></label><label>Credit mode<select value={state.credit} onChange={(event) => updateState({ credit: event.target.value as ResearchState["credit"] })}><option value="full">Full attribution</option><option value="confidence_weighted">Confidence-weighted</option><option value="split_credit">Split credit sensitivity</option></select></label><button type="button" onClick={() => updateState({ states: [], incumbency: "all", completeness: "all", organization: "", credit: "full", evidence: "reviewed" })}>Reset advanced filters</button></section>}
      <Suspense fallback={<div className="view-loading">Loading research view…</div>}>{view}</Suspense>
    </main>

    <Inspector key={`${selection?.id ?? "empty"}-${workspaceRevision}`} selection={selection} evidence={data.evidence} sources={data.sources} onWorkspaceChange={refreshWorkspace} />
    <WorkspacePanel open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} baseReleaseId={data.manifest.releaseId} state={state} people={data.people} camps={data.camps} onChange={refreshWorkspace} />
  </div>;
}
