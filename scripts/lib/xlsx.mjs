import { execFileSync } from "node:child_process";

const decodeXml = (value = "") => value
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&quot;", '"')
  .replaceAll("&apos;", "'")
  .replaceAll("&amp;", "&")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

const unzipText = (filePath, memberPath) => execFileSync("unzip", ["-p", filePath, memberPath], {
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024,
});

const attribute = (attrs, name) => attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] ?? null;

const textRuns = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join("");

const parseSharedStrings = (xml) => [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((match) => textRuns(match[1]));

const columnIndex = (reference) => {
  const letters = reference.match(/^[A-Z]+/)?.[0] ?? "";
  let value = 0;
  for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
  return value - 1;
};

const parseCell = (attrs, inner, sharedStrings) => {
  const type = attribute(attrs, "t");
  if (!inner) return null;
  if (type === "inlineStr") return textRuns(inner).trim();
  const raw = inner.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
  if (raw === undefined) return null;
  if (type === "s") return (sharedStrings[Number(raw)] ?? "").trim();
  if (type === "str" || type === "e") return decodeXml(raw).trim();
  if (type === "b") return raw === "1";
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : decodeXml(raw).trim();
};

const parseRows = (xml, sharedStrings, maxColumn = 64) => {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(attribute(rowMatch[1], "r"));
    const values = [];
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const reference = attribute(cellMatch[1], "r");
      if (!reference) continue;
      const index = columnIndex(reference);
      if (index < 0 || index >= maxColumn) continue;
      values[index] = parseCell(cellMatch[1], cellMatch[2], sharedStrings);
    }
    rows.push({ rowNumber, values });
  }
  return rows;
};

export const columnLetter = (index) => {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

export function openWorkbook(filePath) {
  const workbookXml = unzipText(filePath, "xl/workbook.xml");
  const relationshipsXml = unzipText(filePath, "xl/_rels/workbook.xml.rels");
  let sharedStrings = [];
  try {
    sharedStrings = parseSharedStrings(unzipText(filePath, "xl/sharedStrings.xml"));
  } catch {
    sharedStrings = [];
  }

  const targets = new Map([...relationshipsXml.matchAll(/<Relationship\b([^>]*?)(?:\/>|>[\s\S]*?<\/Relationship>)/g)].map((match) => [
    attribute(match[1], "Id"),
    attribute(match[1], "Target"),
  ]));
  const sheets = new Map();
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*?)(?:\/>|>[\s\S]*?<\/sheet>)/g)) {
    const name = decodeXml(attribute(match[1], "name") ?? "");
    const relationshipId = attribute(match[1], "r:id");
    const target = targets.get(relationshipId);
    if (name && target) sheets.set(name, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
  }

  return {
    sheetNames: [...sheets.keys()],
    readSheet(name, maxColumn = 64) {
      const target = sheets.get(name);
      if (!target) throw new Error(`Workbook ${filePath} has no sheet named ${name}`);
      return parseRows(unzipText(filePath, target), sharedStrings, maxColumn);
    },
  };
}
