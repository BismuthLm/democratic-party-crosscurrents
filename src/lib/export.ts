const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function exportCsv(records: Record<string, unknown>[], filename: string) {
  const headers = [...new Set(records.flatMap((record) => Object.keys(record)))];
  const body = `${headers.map(csvEscape).join(",")}\r\n${records.map((record) => headers.map((header) => csvEscape(record[header])).join(",")).join("\r\n")}\r\n`;
  downloadBlob(new Blob([body], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportJsonl(records: Record<string, unknown>[], filename: string) {
  downloadBlob(new Blob([`${records.map((record) => JSON.stringify(record)).join("\n")}\n`], { type: "application/x-ndjson" }), filename);
}

export { downloadBlob };
