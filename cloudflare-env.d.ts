// Augments @opennextjs/cloudflare's CloudflareEnv with this app's own bindings,
// declared in wrangler.jsonc.
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    LOGOS: R2Bucket;
    BOOKING_READ_LIMITER: RateLimit;
    BOOKING_WRITE_LIMITER: RateLimit;
  }
}

export {};
