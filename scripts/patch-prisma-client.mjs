#!/usr/bin/env node
// `prisma generate` (with engineType = "client") emits two equivalent
// entrypoints for the generated client: index.js (the "node"/default
// condition) and wasm.js (the "workerd"/edge condition). index.js loads its
// wasm query compiler via fs.readFileSync() against an absolute,
// build-machine path -- there's no such file on Cloudflare Workers. wasm.js
// loads it via a bundler-friendly dynamic import() instead.
//
// Our build pipeline (Next.js "serverExternalPackages" + a final Wrangler/
// esbuild bundling pass) doesn't reliably pick the "workerd" condition for
// this package, so index.js (the broken one) keeps winning regardless of
// which entrypoint our own code imports. Simplest fix: make index.js BE
// wasm.js, so it doesn't matter which one gets picked.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(here, "..", "node_modules", ".prisma", "client");
const wasmPath = path.join(clientDir, "wasm.js");
const indexPath = path.join(clientDir, "index.js");

if (!fs.existsSync(wasmPath)) {
  console.log("patch-prisma-client: wasm.js not found, skipping (engineType != \"client\"?)");
  process.exit(0);
}

fs.copyFileSync(wasmPath, indexPath);
console.log("patch-prisma-client: replaced index.js with wasm.js's contents");
