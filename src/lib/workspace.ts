import Dexie, { type Table } from "dexie";

export interface SavedView {
  id: string;
  name: string;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  id: string;
  entityType: string;
  entityId: string;
  label: string;
  createdAt: string;
}

export interface ResearchNote {
  id: string;
  entityType: string;
  entityId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceBookmark {
  id: string;
  sourceId: string;
  label: string;
  createdAt: string;
}

export interface ResearchSession {
  id: string;
  name: string;
  state: Record<string, unknown>;
  startedAt: string;
  updatedAt: string;
}

export interface CampOverride {
  id: string;
  personId: string;
  campId: string;
  validFrom: string;
  validTo: string;
  evidenceRefs: string[];
  confidence: number;
  rationale: string;
  status: "draft" | "reviewed" | "disputed";
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSnapshot {
  savedViews: SavedView[];
  watchlists: WatchlistItem[];
  notes: ResearchNote[];
  sourceBookmarks: SourceBookmark[];
  sessions: ResearchSession[];
  campOverrides: CampOverride[];
}

export interface WorkspaceEnvelope {
  format: "democratic-research-workspace";
  version: 1;
  baseReleaseId: string;
  exportedAt: string;
  data: WorkspaceSnapshot;
  checksum: string;
}

class ResearchWorkspaceDb extends Dexie {
  savedViews!: Table<SavedView, string>;
  watchlists!: Table<WatchlistItem, string>;
  notes!: Table<ResearchNote, string>;
  sourceBookmarks!: Table<SourceBookmark, string>;
  sessions!: Table<ResearchSession, string>;
  campOverrides!: Table<CampOverride, string>;

  constructor() {
    super("democratic-faction-research-workspace");
    this.version(1).stores({
      savedViews: "id, name, updatedAt",
      watchlists: "id, [entityType+entityId], createdAt",
      notes: "id, [entityType+entityId], updatedAt",
      sourceBookmarks: "id, sourceId, createdAt",
      sessions: "id, name, updatedAt",
      campOverrides: "id, personId, campId, [personId+campId], status, updatedAt",
    });
  }
}

export const workspaceDb = new ResearchWorkspaceDb();
export const newWorkspaceId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
};

const checksum = async (value: unknown) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const assertSafeObjectKeys = (value: unknown, path = "workspace") => {
  if (Array.isArray(value)) { value.forEach((item, index) => assertSafeObjectKeys(item, `${path}[${index}]`)); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error(`${path} contains unsafe key ${key}.`);
    assertSafeObjectKeys(item, `${path}.${key}`);
  }
};

export async function getWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const [savedViews, watchlists, notes, sourceBookmarks, sessions, campOverrides] = await Promise.all([
    workspaceDb.savedViews.toArray(),
    workspaceDb.watchlists.toArray(),
    workspaceDb.notes.toArray(),
    workspaceDb.sourceBookmarks.toArray(),
    workspaceDb.sessions.toArray(),
    workspaceDb.campOverrides.toArray(),
  ]);
  return { savedViews, watchlists, notes, sourceBookmarks, sessions, campOverrides };
}

export async function exportWorkspace(baseReleaseId: string): Promise<WorkspaceEnvelope> {
  return createWorkspaceEnvelope(await getWorkspaceSnapshot(), baseReleaseId, nowIso());
}

export async function createWorkspaceEnvelope(data: WorkspaceSnapshot, baseReleaseId: string, exportedAt: string): Promise<WorkspaceEnvelope> {
  const unsigned = {
    format: "democratic-research-workspace" as const,
    version: 1 as const,
    baseReleaseId,
    exportedAt,
    data,
  };
  return { ...unsigned, checksum: await checksum(unsigned) };
}

const stores = ["savedViews", "watchlists", "notes", "sourceBookmarks", "sessions", "campOverrides"] as const;

export async function validateWorkspaceEnvelope(value: unknown): Promise<WorkspaceEnvelope> {
  if (!value || typeof value !== "object") throw new Error("Workspace file must contain a JSON object.");
  assertSafeObjectKeys(value);
  const envelope = value as WorkspaceEnvelope;
  if (envelope.format !== "democratic-research-workspace" || envelope.version !== 1) throw new Error("Unsupported workspace format or version.");
  if (!envelope.baseReleaseId || typeof envelope.baseReleaseId !== "string" || !/^[A-Za-z0-9._-]+$/.test(envelope.baseReleaseId)) throw new Error("Workspace file has an invalid base release ID.");
  if (typeof envelope.exportedAt !== "string" || Number.isNaN(Date.parse(envelope.exportedAt))) throw new Error("Workspace file has an invalid export timestamp.");
  if (typeof envelope.checksum !== "string" || !/^[a-f0-9]{64}$/.test(envelope.checksum)) throw new Error("Workspace file has an invalid checksum.");
  if (!envelope.data || typeof envelope.data !== "object") throw new Error("Workspace file has no data bundle.");
  const unexpectedStores = Object.keys(envelope.data).filter((store) => !stores.includes(store as (typeof stores)[number]));
  if (unexpectedStores.length) throw new Error(`Workspace file contains unexpected stores: ${unexpectedStores.join(", ")}.`);
  for (const store of stores) if (!Array.isArray(envelope.data[store])) throw new Error(`Workspace file is missing ${store}.`);
  const { checksum: expected, ...unsigned } = envelope;
  if (await checksum(unsigned) !== expected) throw new Error("Workspace checksum does not match the file contents.");
  for (const store of stores) {
    const ids = new Set<string>();
    for (const record of envelope.data[store] as Array<{ id?: unknown }>) {
      if (!record || typeof record !== "object" || typeof record.id !== "string" || !record.id) throw new Error(`${store} contains a record without a stable ID.`);
      if (ids.has(record.id)) throw new Error(`${store} contains duplicate ID ${record.id}.`);
      ids.add(record.id);
    }
  }
  for (const override of envelope.data.campOverrides) {
    if (!override.personId || !override.campId || !override.rationale || !Array.isArray(override.evidenceRefs) || !override.evidenceRefs.length || !override.evidenceRefs.every((item) => typeof item === "string" && item.trim()) || !Number.isFinite(override.confidence) || override.confidence < 0 || override.confidence > 1 || !["draft", "reviewed", "disputed"].includes(override.status)) throw new Error(`Camp override ${override.id} is incomplete.`);
    if (!isIsoDate(override.validFrom) || !isIsoDate(override.validTo) || override.validFrom >= override.validTo) throw new Error(`Camp override ${override.id} requires a valid half-open date interval.`);
  }
  return envelope;
}

export async function previewWorkspaceImport(envelope: WorkspaceEnvelope) {
  const current = await getWorkspaceSnapshot();
  return Object.fromEntries(stores.map((store) => {
    const existing = new Set(current[store].map((record) => record.id));
    const incoming = envelope.data[store];
    return [store, { incoming: incoming.length, conflicts: incoming.filter((record) => existing.has(record.id)).length, current: current[store].length }];
  }));
}

export async function applyWorkspaceImport(envelope: WorkspaceEnvelope, mode: "merge" | "replace") {
  const validated = await validateWorkspaceEnvelope(envelope);
  await workspaceDb.transaction("rw", [workspaceDb.savedViews, workspaceDb.watchlists, workspaceDb.notes, workspaceDb.sourceBookmarks, workspaceDb.sessions, workspaceDb.campOverrides], async () => {
    if (mode === "replace") await Promise.all(stores.map((store) => workspaceDb[store].clear()));
    for (const store of stores) {
      const table = workspaceDb[store] as Table<{ id: string }, string>;
      const existing = mode === "merge" ? new Set((await table.toArray()).map((record) => record.id)) : new Set<string>();
      const records = validated.data[store].map((record) => existing.has(record.id) ? { ...record, id: newWorkspaceId() } : record) as Array<{ id: string }>;
      if (records.length) await table.bulkAdd(records);
    }
  });
}

export async function workspaceCounts() {
  const values = await Promise.all(stores.map((store) => workspaceDb[store].count()));
  return Object.fromEntries(stores.map((store, index) => [store, values[index]])) as Record<(typeof stores)[number], number>;
}
