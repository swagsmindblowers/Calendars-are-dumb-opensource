#!/usr/bin/env node
// First-run helper: creates .env from .env.example and fills in the two
// secrets you'd otherwise have to generate by hand. Safe to re-run -- it only
// fills in values that are still empty and never overwrites anything you set.
//
//   npm run setup
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log("Created .env from .env.example");
}

let env = fs.readFileSync(envPath, "utf8");
const generated = {
  AUTH_SECRET: () => crypto.randomBytes(32).toString("base64"),
  TOKEN_ENCRYPTION_KEY: () => crypto.randomBytes(32).toString("base64"),
};

for (const [key, make] of Object.entries(generated)) {
  const re = new RegExp(`^${key}=(?:""|)\\s*$`, "m");
  if (re.test(env)) {
    env = env.replace(re, `${key}="${make()}"`);
    console.log(`Generated ${key}`);
  }
}
fs.writeFileSync(envPath, env);

console.log(`
Done. Next steps:
  1. (Optional) set AUTH_DEV_BYPASS="true" in .env to try the app without OAuth
  2. npm run db:migrate     # create the local database
  3. npm run cf:preview     # build and serve at http://localhost:8787

Google / Microsoft / Resend keys are optional -- see the README ("OAuth setup").
Production secrets are NOT read from .env; set them with 'wrangler secret put'.
Back up TOKEN_ENCRYPTION_KEY: losing it makes stored calendar tokens unreadable.
`);
