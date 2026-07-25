#!/usr/bin/env node
/**
 * Poids gzip du JS client servi par Next.
 *
 * `next build` sous Turbopack n'affiche plus la colonne « First Load JS ».
 * On mesure donc directement les chunks de .next/static, qui sont exactement
 * ce que le navigateur télécharge.
 *
 *   node scripts/bundle-size.mjs [--json]
 */
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = ".next/static";

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (entry.endsWith(".js")) acc.push(p);
  }
  return acc;
}

const files = walk(ROOT);
let raw = 0;
let gzip = 0;
for (const f of files) {
  const buf = readFileSync(f);
  raw += buf.length;
  gzip += gzipSync(buf).length;
}

const kb = (n) => (n / 1024).toFixed(1);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ files: files.length, raw, gzip }));
} else {
  console.log(`fichiers JS : ${files.length}`);
  console.log(`brut        : ${kb(raw)} KB`);
  console.log(`gzip        : ${kb(gzip)} KB`);
}
