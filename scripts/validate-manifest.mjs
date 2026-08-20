import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(projectRoot, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];

function requireValue(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

async function requireFile(relativePath) {
  try {
    await access(path.join(projectRoot, relativePath), constants.R_OK);
  } catch {
    errors.push(`Mangler fil: ${relativePath}`);
  }
}

requireValue(manifest.manifest_version === 3, "manifest_version skal være 3");
requireValue(typeof manifest.name === "string" && manifest.name.length > 0, "name mangler");
requireValue(/^\d+\.\d+\.\d+$/u.test(manifest.version || ""), "version skal følge x.y.z");
requireValue(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0, "content_scripts mangler");
requireValue(!(manifest.permissions || []).includes("<all_urls>"), "<all_urls> må ikke være en permission");
requireValue(!(manifest.host_permissions || []).includes("<all_urls>"), "<all_urls> må ikke være en host permission");

const referencedFiles = new Set();
if (manifest.action?.default_popup) {
  referencedFiles.add(manifest.action.default_popup);
}
Object.values(manifest.icons || {}).forEach((file) => referencedFiles.add(file));
Object.values(manifest.action?.default_icon || {}).forEach((file) => referencedFiles.add(file));

for (const contentScript of manifest.content_scripts || []) {
  [...(contentScript.js || []), ...(contentScript.css || [])]
    .forEach((file) => referencedFiles.add(file));
  for (const match of contentScript.matches || []) {
    requireValue(/^https:\/\/(?:www\.|m\.)?youtube\.com\/\*$/u.test(match), `For bred URL-adgang: ${match}`);
  }
}

await Promise.all([...referencedFiles].map(requireFile));

for (const sourceFile of [...referencedFiles].filter((file) => file.endsWith(".js"))) {
  const source = await readFile(path.join(projectRoot, sourceFile), "utf8");
  requireValue(!/\beval\s*\(|\bnew\s+Function\b/u.test(source), `Dynamisk kodekørsel i ${sourceFile}`);
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Manifest OK (${referencedFiles.size} refererede filer kontrolleret)`);
}
