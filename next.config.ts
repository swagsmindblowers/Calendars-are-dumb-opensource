import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  agentRules: false,
  // Don't let Next.js bundle these at build time — leave them external so the
  // final Cloudflare Workers build resolves them itself under the "workerd"
  // export condition (the engine-less wasm build Prisma's D1 adapter needs).
  // Bundling them during `next build` bakes in the wrong (Node) resolution.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

// Wires up Cloudflare bindings (D1, etc.) for `next dev` so getCloudflareContext()
// works locally too, not just under `wrangler`/`opennextjs-cloudflare` preview.
initOpenNextCloudflareForDev();
