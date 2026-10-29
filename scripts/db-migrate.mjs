#!/usr/bin/env node
// Applies prisma/migrations/*/migration.sql to the D1 database bound as "DB".
//
// Wrangler's own `d1 migrations apply` wants a flat folder of .sql files, but
// Prisma keeps one folder per migration. This flattens them into ./migrations
// (git-ignored, regenerated every run) and lets Wrangler do the tracking, so
// re-running only applies what's new.
//
//   node scripts/db-migrate.mjs            # local D1 (used by `npm run dev`)
//   node scripts/db-migrate.mjs --remote   # your real Cloudflare D1 database
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "prisma", "migrations");
const dest = path.join(root, "migrations");

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest);

const names = fs
  .readdirSync(src, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
for (const name of names) {
  fs.copyFileSync(path.join(src, name, "migration.sql"), path.join(dest, `${name}.sql`));
}

const target = process.argv.includes("--remote") ? "--remote" : "--local";
const result = spawnSync(
  "npx",
  ["wrangler", "d1", "migrations", "apply", "DB", target],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);
process.exit(result.status ?? 1);
