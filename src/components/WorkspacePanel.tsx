import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { Camp, Person } from "../types";
import type { ResearchState } from "../lib/urlState";
import { downloadBlob } from "../lib/export";
import { applyWorkspaceImport, exportWorkspace, newWorkspaceId, nowIso, previewWorkspaceImport, validateWorkspaceEnvelope, workspaceCounts, workspaceDb, type WorkspaceEnvelope } from "../lib/workspace";

interface WorkspacePanelProps {
  open: boolean;
  onClose: () => void;
  baseReleaseId: string;
  state: ResearchState;
  people: Person[];
  camps: Camp[];
  onChange: () => void;
}

const emptyOverride = { personId: "", campId: "", validFrom: "", validTo: "", evidenceRefs: "", confidence: "0.8", rationale: "", status: "draft" as const };

export function WorkspacePanel({ open, onClose, baseReleaseId, state, people, camps, onChange }: WorkspacePanelProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [savedName, setSavedName] = useState("");
  const [message, setMessage] = useState("");
  const [incoming, setIncoming] = useState<WorkspaceEnvelope | null>(null);
  const [preview, setPreview] = useState<Record<string, { incoming: number; conflicts: number; current: number }> | null>(null);
  const [override, setOverride] = useState(emptyOverride);

  const refresh = async () => setCounts(await workspaceCounts());
  useEffect(() => { if (open) void refresh(); }, [open]);
  const total = useMemo(() => Object.values(counts).reduce((sum, value) => sum + value, 0), [counts]);

  const saveView = async () => {
    if (!savedName.trim()) return;
    const timestamp = nowIso();
    await workspaceDb.savedViews.add({ id: newWorkspaceId(), name: savedName.trim(), state: state as unknown as Record<string, unknown>, createdAt: timestamp, updatedAt: timestamp });
    setSavedName("");
    setMessage("Saved view added");
    await refresh(); onChange();
  };

  const exportLocal = async () => {
    const envelope = await exportWorkspace(baseReleaseId);
    downloadBlob(new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" }), "democratic-research-workspace.v1.json");
    setMessage("Workspace exported");
  };

  const chooseImport = async (event: ChangeEvent<HTMLInputElement>) => {
    setMessage(""); setIncoming(null); setPreview(null);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const envelope = await validateWorkspaceEnvelope(JSON.parse(await file.text()));
      setIncoming(envelope);
      setPreview(await previewWorkspaceImport(envelope));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read workspace file");
    } finally {
      event.target.value = "";
    }
  };

  const applyImport = async (mode: "merge" | "replace") => {
    if (!incoming) return;
    await applyWorkspaceImport(incoming, mode);
    setIncoming(null); setPreview(null); setMessage(mode === "merge" ? "Workspace merged; conflicts were cloned" : "Local workspace replaced");
    await refresh(); onChange();
  };

  const saveOverride = async () => {
    const confidence = Number(override.confidence);
    const evidenceRefs = override.evidenceRefs.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    if (!override.personId || !override.campId || !override.validFrom || !override.validTo || override.validFrom >= override.validTo || !override.rationale.trim() || !evidenceRefs.length || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      setMessage("Override needs a person, camp, valid start/end dates, evidence, rationale, and confidence from 0 to 1."); return;
    }
    const timestamp = nowIso();
    await workspaceDb.campOverrides.add({ id: newWorkspaceId(), personId: override.personId, campId: override.campId, validFrom: override.validFrom, validTo: override.validTo, evidenceRefs, confidence, rationale: override.rationale.trim(), status: override.status, createdAt: timestamp, updatedAt: timestamp });
    setOverride(emptyOverride); setMessage("Local camp overlay added");
    await refresh(); onChange();
  };

  if (!open) return null;
  return <div className="workspace-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="workspace-panel" role="dialog" aria-modal="true" aria-labelledby="workspace-title">
      <header><div><span>PRIVATE · THIS BROWSER</span><h2 id="workspace-title">Research workspace</h2></div><button type="button" onClick={onClose} aria-label="Close workspace">×</button></header>
      <div className="workspace-release"><span>Base release</span><strong>{baseReleaseId}</strong><small>{total} local records · never included in public comparisons</small></div>
      {message && <p className="workspace-message" role="status">{message}</p>}
      <section><h3>Save current view</h3><div className="inline-form"><input value={savedName} onChange={(event) => setSavedName(event.target.value)} placeholder="View name" /><button type="button" onClick={saveView}>Save</button></div><p>{counts.savedViews ?? 0} views · {counts.watchlists ?? 0} watched records · {counts.notes ?? 0} notes</p></section>
      <section><h3>Portable workspace</h3><div className="workspace-buttons"><button type="button" onClick={exportLocal}>Export v1 JSON</button><label className="file-button">Choose import<input type="file" accept="application/json,.json" onChange={chooseImport} /></label></div>{incoming && preview && <div className="import-preview"><strong>Import preview</strong><span>Release {incoming.baseReleaseId}</span>{Object.entries(preview).map(([store, item]) => <span key={store}>{store}: {item.incoming} incoming · {item.conflicts} conflicts</span>)}<div><button type="button" onClick={() => applyImport("merge")}>Merge and clone conflicts</button><button className="danger" type="button" onClick={() => applyImport("replace")}>Replace local workspace</button></div></div>}</section>
      <section><h3>Add local camp overlay</h3><p>Overrides require a bounded half-open date interval and cited evidence. They never alter the immutable base release.</p><label>Person<select value={override.personId} onChange={(event) => setOverride({ ...override, personId: event.target.value })}><option value="">Select a person</option>{people.filter((person) => person.bioguideId || person.currentCampIds.length).slice(0, 250).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Camp<select value={override.campId} onChange={(event) => setOverride({ ...override, campId: event.target.value })}><option value="">Select a camp</option>{camps.map((camp) => <option key={camp.id} value={camp.id}>{camp.name}</option>)}</select></label><div className="date-pair"><label>Valid from<input type="date" required value={override.validFrom} onChange={(event) => setOverride({ ...override, validFrom: event.target.value })} /></label><label>Valid to (exclusive)<input type="date" required min={override.validFrom || undefined} value={override.validTo} onChange={(event) => setOverride({ ...override, validTo: event.target.value })} /></label></div><label>Evidence references<textarea rows={2} value={override.evidenceRefs} onChange={(event) => setOverride({ ...override, evidenceRefs: event.target.value })} placeholder="Source URL or evidence ID, one per line" /></label><label>Confidence<input type="number" min="0" max="1" step="0.05" value={override.confidence} onChange={(event) => setOverride({ ...override, confidence: event.target.value })} /></label><label>Rationale<textarea rows={3} value={override.rationale} onChange={(event) => setOverride({ ...override, rationale: event.target.value })} /></label><label>Status<select value={override.status} onChange={(event) => setOverride({ ...override, status: event.target.value as typeof override.status })}><option value="draft">Draft</option><option value="reviewed">Locally reviewed</option><option value="disputed">Disputed</option></select></label><button className="primary-button full" type="button" onClick={saveOverride}>Add overlay</button><p>{counts.campOverrides ?? 0} active local override records</p></section>
    </aside>
  </div>;
}
