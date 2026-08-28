import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppData } from "../appData";
import type { InspectorSelection, Person } from "../types";
import type { ResearchState } from "../lib/urlState";
import type { CampOverride } from "../lib/workspace";
import { VirtualTable } from "../components/VirtualTable";
import { SectionHeading, gradeWeight } from "./shared";
import { ResearchChart } from "../components/ResearchChart";

interface PersonRow extends Person {
  campNames: string;
  baseCampNames: string;
  effectiveCampIds: string[];
  localOverrideCount: number;
  relationshipCount: number;
  observedOrganizations: string;
}

const overlapsWindow = (validFrom: string | null, validTo: string | null, from: string, to: string) => (validFrom ?? "0000-01-01") <= to && (validTo ?? "9999-12-31") > from;

export function PeopleView({ data, state, localOverrides, onSelect }: { data: AppData; state: ResearchState; localOverrides: CampOverride[]; onSelect: (selection: InspectorSelection) => void }) {
  const campMap = new Map(data.camps.map((camp) => [camp.id, camp]));
  const orgMap = new Map(data.organizations.map((organization) => [organization.id, organization]));
  const contestMap = useMemo(() => new Map(data.contests.map((contest) => [contest.id, contest])), [data.contests]);
  const scopedPersonIds = useMemo(() => new Set(data.candidacies.filter((candidacy) => {
    const contest = contestMap.get(candidacy.contestId);
    return contest && state.cycles.includes(contest.cycle) && contest.cycle >= Number(state.from.slice(0, 4)) && contest.cycle <= Number(state.to.slice(0, 4)) && (state.chamber === "all" || contest.chamber === state.chamber) && (!state.states.length || state.states.includes(contest.state));
  }).map((candidacy) => candidacy.personId)), [data.candidacies, contestMap, state.cycles, state.from, state.to, state.chamber, state.states]);
  const relationshipByPerson = useMemo(() => {
    const map = new Map<string, typeof data.relationships>();
    for (const relationship of data.relationships.filter((item) => (state.evidence === "all" || item.evidenceGrade !== "D") && (!item.cycle || state.cycles.includes(item.cycle)) && overlapsWindow(item.validFrom, item.validTo, state.from, state.to))) {
      if (!map.has(relationship.personId)) map.set(relationship.personId, []);
      map.get(relationship.personId)!.push(relationship);
    }
    return map;
  }, [data.relationships, state.evidence, state.cycles, state.from, state.to]);
  const baseCampsByPerson = useMemo(() => {
    const map = new Map<string, typeof data.campRelationships>();
    for (const relationship of data.campRelationships.filter((item) => (state.evidence === "all" || item.evidenceWeight > 0) && (!item.cycle || state.cycles.includes(item.cycle)) && overlapsWindow(item.validFrom, item.validTo, state.from, state.to))) {
      if (!map.has(relationship.personId)) map.set(relationship.personId, []);
      map.get(relationship.personId)!.push(relationship);
    }
    return map;
  }, [data.campRelationships, state.evidence, state.cycles, state.from, state.to]);
  const activeOverrides = useMemo(() => localOverrides.filter((item) => (state.evidence === "all" || item.status !== "disputed") && overlapsWindow(item.validFrom, item.validTo, state.from, state.to)), [localOverrides, state.evidence, state.from, state.to]);
  const overridesByPerson = useMemo(() => {
    const map = new Map<string, CampOverride[]>();
    for (const override of activeOverrides) { if (!map.has(override.personId)) map.set(override.personId, []); map.get(override.personId)!.push(override); }
    return map;
  }, [activeOverrides]);
  const rows = useMemo(() => data.people.map((person) => {
    const relationships = relationshipByPerson.get(person.id) ?? [];
    const baseCampIds = [...new Set((baseCampsByPerson.get(person.id) ?? []).map((item) => item.campId))];
    const personOverrides = overridesByPerson.get(person.id) ?? [];
    const effectiveCampIds = [...new Set([...baseCampIds, ...personOverrides.map((item) => item.campId)])];
    return { ...person, baseCampNames: baseCampIds.map((id) => campMap.get(id)?.shortName ?? id).join(", "), campNames: effectiveCampIds.map((id) => campMap.get(id)?.shortName ?? id).join(", "), effectiveCampIds, localOverrideCount: personOverrides.length, relationshipCount: relationships.length, observedOrganizations: relationships.map((item) => orgMap.get(item.organizationId)?.shortName ?? item.organizationId).join(", ") };
  }).filter((person) => {
    if ((state.chamber !== "all" || state.states.length || state.cycles.length < 5 || state.from !== "2018-01-01" || state.to !== "2026-08-28") && !scopedPersonIds.has(person.id) && !(relationshipByPerson.get(person.id)?.length)) return false;
    const query = state.search.toLowerCase();
    if (query && !`${person.name} ${person.fecCandidateId} ${person.bioguideId} ${person.campNames} ${person.observedOrganizations}`.toLowerCase().includes(query)) return false;
    if (state.camps.length && !state.camps.some((campId) => person.effectiveCampIds.includes(campId))) return false;
    if (state.organization && !(relationshipByPerson.get(person.id) ?? []).some((relationship) => relationship.organizationId === state.organization)) return false;
    return true;
  }), [data.people, state.search, state.camps, state.organization, state.chamber, state.states, state.cycles, state.from, state.to, scopedPersonIds, relationshipByPerson, baseCampsByPerson, overridesByPerson, campMap, orgMap]);

  const campCounts = data.camps.map((camp) => {
    let baseValue = 0; let localValue = 0;
    for (const person of rows) {
      const baseLinks = (baseCampsByPerson.get(person.id) ?? []).filter((item) => item.campId === camp.id);
      const overlayLinks = (overridesByPerson.get(person.id) ?? []).filter((item) => item.campId === camp.id);
      if (baseLinks.length) {
        if (state.credit === "split_credit") baseValue += 1 / Math.max(1, (baseCampsByPerson.get(person.id) ?? []).map((item) => item.campId).filter((id, index, ids) => ids.indexOf(id) === index).length);
        else if (state.credit === "confidence_weighted") baseValue += Math.max(...baseLinks.map((link) => link.evidenceWeight));
        else baseValue += 1;
      }
      if (baseLinks.length || overlayLinks.length) {
        if (state.credit === "split_credit") localValue += 1 / Math.max(1, person.effectiveCampIds.length);
        else if (state.credit === "confidence_weighted") localValue += Math.max(0, ...baseLinks.map((link) => link.evidenceWeight), ...overlayLinks.map((link) => link.confidence));
        else localValue += 1;
      }
    }
    return { camp, baseValue, localValue };
  });

  const networkPeople = rows.filter((person) => (relationshipByPerson.get(person.id)?.length ?? 0) > 0);
  const networkRelationships = data.relationships.filter((relationship) => networkPeople.some((person) => person.id === relationship.personId) && (state.evidence === "all" || relationship.evidenceGrade !== "D"));
  const usedOrganizations = data.organizations.filter((organization) => networkRelationships.some((relationship) => relationship.organizationId === organization.id));
  const networkOption = {
    animation: false,
    tooltip: { formatter: (params: { data?: { name?: string; detail?: string } }) => params.data?.detail ? `${params.data.name}<br/>${params.data.detail}` : params.data?.name },
    series: [{ type: "graph", layout: "force", roam: true, draggable: false, force: { repulsion: 230, edgeLength: [65, 115], gravity: 0.08 }, label: { show: true, fontSize: 9, color: "#26313b" }, lineStyle: { color: "source", opacity: 0.45, width: 1 }, emphasis: { focus: "adjacency" }, data: [
      ...networkPeople.map((person) => ({ id: person.id, name: person.name, detail: `${person.campNames || "No derived camp in window"}${person.localOverrideCount ? ` · ${person.localOverrideCount} local overlay` : ""}`, symbolSize: 19 + person.effectiveCampIds.length * 4, itemStyle: { color: person.effectiveCampIds[0] ? campMap.get(person.effectiveCampIds[0])?.color : "#8a929a" }, category: 0 })),
      ...usedOrganizations.map((organization) => ({ id: organization.id, name: organization.shortName, detail: organization.type.replaceAll("_", " "), symbol: "rect", symbolSize: [42, 20], itemStyle: { color: "#e4e8ec", borderColor: "#576574", borderWidth: 1 }, category: 1 })),
    ], links: networkRelationships.map((relationship) => ({ source: relationship.personId, target: relationship.organizationId, value: relationship.type, lineStyle: { type: relationship.evidenceGrade === "D" ? "dashed" : "solid", opacity: gradeWeight(relationship.evidenceGrade) * 0.55 } })) }],
  };

  const columns = useMemo<ColumnDef<PersonRow, unknown>[]>(() => [
    { accessorKey: "name", header: "Person", size: 205, cell: ({ row }) => <span className="primary-cell"><strong>{row.original.name}</strong><small>{row.original.actualParty}</small></span> },
    { accessorKey: "campNames", header: "Derived camps in window", size: 220, cell: ({ row }) => <span className="primary-cell"><strong>{row.original.campNames || "Unclassified"}</strong>{row.original.localOverrideCount > 0 && <small>{row.original.baseCampNames || "No base camp"} · +{row.original.localOverrideCount} local</small>}</span> },
    { accessorKey: "observedOrganizations", header: "Observed organizations", size: 245, cell: ({ getValue }) => String(getValue() || "—") },
    { accessorKey: "relationshipCount", header: "Relations", size: 78 },
    { accessorKey: "bioguideId", header: "Bioguide", size: 90, cell: ({ getValue }) => String(getValue() ?? "—") },
    { accessorKey: "fecCandidateId", header: "FEC ID", size: 100, cell: ({ getValue }) => String(getValue() ?? "—") },
    { accessorKey: "source", header: "Identity source", size: 150, cell: ({ getValue }) => String(getValue()).replaceAll("_", " ") },
  ], []);

  return <div className="view-stack"><div className="people-summary">{campCounts.map(({ camp, baseValue, localValue }) => <article key={camp.id} style={{ "--camp": camp.color } as React.CSSProperties}><span>{state.credit.replaceAll("_", " ")} · filtered window</span><strong>{localValue.toFixed(localValue % 1 ? 1 : 0)}</strong><p>{camp.shortName}</p>{activeOverrides.length > 0 && <small>base {baseValue.toFixed(baseValue % 1 ? 1 : 0)} · local delta {(localValue - baseValue) >= 0 ? "+" : ""}{(localValue - baseValue).toFixed(1)}</small>}</article>)}</div>
    <section className="research-card"><SectionHeading eyebrow="ENTITY TABLE" title={`${rows.length.toLocaleString()} people in the filtered federal record`} description="Candidate identities come from official FEC result rows; organizational links are separately reviewed. Local overlays are visibly additive and never enter public comparisons." /><VirtualTable data={rows} columns={columns} height={510} ariaLabel="People and faction relationships" onSelect={(person) => onSelect({ kind: "person", id: person.id, title: person.name, subtitle: person.campNames || "No derived camp in window", record: person as unknown as Record<string, unknown>, evidenceIds: data.relationships.filter((relationship) => relationship.personId === person.id).map((relationship) => `evidence-${relationship.id}`) })} /></section>
    <section className="research-card chart-card"><SectionHeading eyebrow="OBSERVED NETWORK" title="Reviewed starter relationship graph" description="Organization edges show membership, endorsement, program, or office relations. They are not collapsed into one ideological label." /><ResearchChart option={networkOption} height={520} onEvents={{ click: ((params: { dataType?: string; data?: { id?: string; name?: string } }) => { const id = params.data?.id; if (!id) return; const person = data.people.find((item) => item.id === id); const organization = data.organizations.find((item) => item.id === id); onSelect(person ? { kind: "person", id: person.id, title: person.name, record: person as unknown as Record<string, unknown> } : { kind: "organization", id: organization!.id, title: organization!.name, record: organization as unknown as Record<string, unknown> }); }) as (params: never) => void }} /></section>
  </div>;
}
