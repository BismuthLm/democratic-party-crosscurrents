import { readFile, writeFile } from "node:fs/promises";

const inputUrl = new URL("../data/power-data.json", import.meta.url);
const outputUrl = new URL("../src/data.js", import.meta.url);
const data = JSON.parse(await readFile(inputUrl, "utf8"));
const banner = "// Generated from data/power-data.json by npm run build:data.\n";
await writeFile(outputUrl, `${banner}window.CROSSCURRENTS_DATA = ${JSON.stringify(data, null, 2)};\n`);
console.log(`Built ${outputUrl.pathname}`);
