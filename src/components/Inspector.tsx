import { useEffect, useMemo, useState } from "react";
import type { EvidenceRecord, InspectorSelection, SourceRecord } from "../types";
import { newWorkspaceId, nowIso, workspaceDb } from "../lib/workspace";

interface InspectorProps {
  selection: InspectorSelection | null;
  evidence: EvidenceRecord[];
  sources: SourceRecord[];
  onWorkspaceChange: () => void;
}

const displayValue = (value: unknown) => {
  if (value === null || value === undefined) return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export function Inspector({ selection, evidence, sources, onWorkspaceChange }: InspectorProps) {
  const [note, setNote] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  useEffect(() => {
    let active = true;
    if (!selection) { setNote(""); return; }
    workspaceDb.notes.where("[entityType+entityId]").equals([selection.kind, selection.id]).first().then((record) => { if (active) setNote(record?.text ?? ""); });
    return () => { active = false; };
  }, [selection]);
  const relatedEvidence = useMemo(() => selection ? evidence.filter((record) => selection.evidenceIds?.includes(record.id) || record.factId === selection.id || selection.sourceIds?.includes(record.sourceId ?? "")) : [], [selection, evidence]);
  const relatedSources = useMemo(() => {
    if (!selection) return [];
    const ids = new Set([...relatedEvidence.map((record) => record.sourceId), ...(selection.sourceIds ?? [])].filter(Boolean));
    return sources.filter((source) => ids.has(source.id));
  }, [selection, relatedEvidence, sources]);

  const saveNote = async () => {
    if (!selection) return;
    const existing = await workspaceDb.notes.where("[entityType+entityId]").equals([selection.kind, selection.id]).first();
    const timestamp = nowIso();
    if (!note.trim()) { if (existing) await workspaceDb.notes.delete(existing.id); }
    else await workspaceDb.notes.put({ id: existing?.id ?? newWorkspaceId(), entityType: selection.kind, entityId: selection.id, text: note.trim(), createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp });
    setSavedMessage("Note saved locally");
    setTimeout(() => setSavedMessage(""), 1800);
    onWorkspaceChange();
  };

  const addWatch = async () => {
    if (!selection) return;
    const existing = await workspaceDb.watchlists.where("[entityType+entityId]").equals([selection.kind, selection.id]).first();
    if (!existing) await workspaceDb.watchlists.add({ id: newWorkspaceId(), entityType: selection.kind, entityId: selection.id, label: selection.title, createdAt: nowIso() });
    setSavedMessage(existing ? "Already on watchlist" : "Added to watchlist");
    setTimeout(() => setSavedMessage(""), 1800);
    onWorkspaceChange();
  };

  if (!selection) return <aside className="inspector research-inspector" aria-label="Evidence inspector"><div className="inspector-head"><div><span>EVIDENCE INSPECTOR</span><strong>No selection</strong></div></div><div className="inspector-empty"><strong>Select a row, cell, chart mark, person, race, or source.</strong><p>The inspector will show raw fields, derivation, validity dates, caveats, and source links.</p></div></aside>;

  const recordEntries = Object.entries(selection.record).filter(([, value]) => typeof value !== "object" || value === null).slice(0, 16);
  return <aside className="inspector research-inspector" aria-label="Evidence inspector">
    <div className="inspector-head"><div><span>{selection.kind.toUpperCase()}</span><strong>{selection.id}</strong></div><button type="button" onClick={addWatch} aria-label="Add selected record to watchlist">＋</button></div>
    <section><span className="status reviewed">Base evidence</span><h2>{selection.title}</h2>{selection.subtitle && <p>{selection.subtitle}</p>}<div className="inspector-actions"><button type="button" onClick={addWatch}>Watch</button><span>{savedMessage}</span></div></section>
    <dl>{recordEntries.map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{displayValue(value)}</dd></div>)}</dl>
    <section><h3>Evidence chain</h3>{relatedEvidence.length ? relatedEvidence.slice(0, 12).map((record) => <article className="evidence-item" key={record.id}><div><span className={`grade grade-${record.evidenceGrade.toLowerCase()}`}>{record.evidenceGrade}</span><strong>{record.reviewStatus.replaceAll("_", " ")}</strong></div><p>{record.rationale}</p><small>{record.locator}</small></article>) : <p>No field-level evidence record is linked to this migrated row. Check its source IDs and caveat.</p>}</section>
    <section><h3>Sources</h3>{relatedSources.length ? relatedSources.map((source) => <a key={source.id} href={source.canonicalUrl} target="_blank" rel="noreferrer"><span>{source.publisher}<small>{source.title}</small></span><b>↗</b></a>) : <p>No direct source link is available for this selected record.</p>}</section>
    <section><h3>Local research note</h3><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Plain-text note stored only in this browser…" rows={5}></textarea><button className="primary-button full" type="button" onClick={saveNote}>Save note locally</button></section>
  </aside>;
}
