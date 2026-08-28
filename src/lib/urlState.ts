import type { CreditMode, ViewId } from "../types";

export interface ResearchState {
  version: 1;
  view: ViewId;
  from: string;
  to: string;
  chamber: "all" | "House" | "Senate";
  cycles: number[];
  states: string[];
  camps: string[];
  credit: CreditMode;
  evidence: "reviewed" | "all";
  completeness: "all" | "complete" | "incomplete";
  incumbency: "all" | "incumbent" | "challenger";
  organization: string;
  measures: string[];
  model: string;
  modelWeights: Record<string, number>;
  search: string;
}

export const defaultResearchState: ResearchState = {
  version: 1,
  view: "overview",
  from: "2018-01-01",
  to: "2026-08-28",
  chamber: "all",
  cycles: [2018, 2020, 2022, 2024, 2026],
  states: [],
  camps: [],
  credit: "full",
  evidence: "reviewed",
  completeness: "all",
  incumbency: "all",
  organization: "",
  measures: [],
  model: "balanced-core-v1",
  modelWeights: {},
  search: "",
};

const uniqueSorted = (values: string[]) => [...new Set(values.filter(Boolean))].sort();
const supportedCycles = new Set([2018, 2020, 2022, 2024, 2026]);
const validDate = (value: string | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText); const month = Number(monthText); const day = Number(dayText);
  if (year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : null;
};

const parseModelWeights = (value: string | null) => Object.fromEntries(uniqueSorted((value ?? "").split(",")).flatMap((item) => {
  const [id, numberText, ...rest] = item.split(":");
  const weight = Number(numberText);
  return id && !rest.length && Number.isFinite(weight) && weight >= 0 && weight <= 100 ? [[id, weight]] : [];
}));

export function parseResearchState(search = typeof window === "undefined" ? "" : window.location.search): ResearchState {
  const params = new URLSearchParams(search);
  const state = structuredClone(defaultResearchState);
  const version = params.get("v");
  if (version && version !== "1") return state;
  const view = params.get("view") as ViewId | null;
  if (["overview", "compare", "people", "elections", "money", "institutions", "model", "sources"].includes(view ?? "")) state.view = view!;
  const from = validDate(params.get("from"));
  const to = validDate(params.get("to"));
  const candidateFrom = from ?? state.from;
  const candidateTo = to ?? state.to;
  if (candidateFrom <= candidateTo) { state.from = candidateFrom; state.to = candidateTo; }
  const chamber = params.get("chamber");
  if (["all", "House", "Senate"].includes(chamber ?? "")) state.chamber = chamber as ResearchState["chamber"];
  const cycles = [...new Set(uniqueSorted((params.get("cycles") ?? "").split(",")).map(Number).filter((cycle) => supportedCycles.has(cycle)))].sort((left, right) => left - right);
  if (cycles.length) state.cycles = cycles;
  state.states = uniqueSorted((params.get("states") ?? "").split(","));
  state.camps = uniqueSorted((params.get("camps") ?? "").split(","));
  const credit = params.get("credit");
  if (["full", "confidence_weighted", "split_credit"].includes(credit ?? "")) state.credit = credit as CreditMode;
  if (params.get("evidence") === "all") state.evidence = "all";
  const completeness = params.get("complete");
  if (["all", "complete", "incomplete"].includes(completeness ?? "")) state.completeness = completeness as ResearchState["completeness"];
  const incumbency = params.get("incumbency");
  if (["all", "incumbent", "challenger"].includes(incumbency ?? "")) state.incumbency = incumbency as ResearchState["incumbency"];
  state.organization = params.get("organization") || "";
  state.measures = uniqueSorted((params.get("measures") ?? "").split(","));
  state.model = params.get("model") || state.model;
  state.modelWeights = parseModelWeights(params.get("weights"));
  state.search = params.get("q") || "";
  return state;
}

export function serializeResearchState(state: ResearchState, pathname = typeof window === "undefined" ? "/" : window.location.pathname) {
  const params = new URLSearchParams();
  params.set("v", "1");
  if (state.view !== defaultResearchState.view) params.set("view", state.view);
  if (state.from !== defaultResearchState.from) params.set("from", state.from);
  if (state.to !== defaultResearchState.to) params.set("to", state.to);
  if (state.chamber !== "all") params.set("chamber", state.chamber);
  const cycles = [...new Set(state.cycles)].sort((left, right) => left - right);
  if (cycles.join(",") !== defaultResearchState.cycles.join(",")) params.set("cycles", cycles.join(","));
  if (state.states.length) params.set("states", uniqueSorted(state.states).join(","));
  if (state.camps.length) params.set("camps", uniqueSorted(state.camps).join(","));
  if (state.credit !== "full") params.set("credit", state.credit);
  if (state.evidence !== "reviewed") params.set("evidence", state.evidence);
  if (state.completeness !== "all") params.set("complete", state.completeness);
  if (state.incumbency !== "all") params.set("incumbency", state.incumbency);
  if (state.organization) params.set("organization", state.organization);
  if (state.measures.length) params.set("measures", uniqueSorted(state.measures).join(","));
  if (state.model !== defaultResearchState.model) params.set("model", state.model);
  const modelWeights = Object.entries(state.modelWeights).filter(([, value]) => Number.isFinite(value) && value >= 0 && value <= 100).sort(([left], [right]) => left.localeCompare(right));
  if (modelWeights.length) params.set("weights", modelWeights.map(([id, value]) => `${id}:${Number(value)}`).join(","));
  if (state.search) params.set("q", state.search);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

export function replaceUrlState(state: ResearchState) {
  window.history.replaceState({ researchState: state }, "", serializeResearchState(state));
}
