/**
 * AI roadmap configuration. The only knobs you should need to touch.
 *
 * ROADMAP_BILLING
 *   'developer' — the app OWNER's DeepSpace credits pay for every roadmap.
 *                 Reviewers can try the feature with no setup, so this is the
 *                 default; the rate limit and input caps below limit the spend.
 *   'user'      — each signed-in user's own DeepSpace credits pay instead
 *                 (the caller's JWT is forwarded to the AI proxy).
 */
export const ROADMAP_BILLING: 'developer' | 'user' = 'developer'

/** Preferred model id from the SDK's catalog (`DEEPSPACE_AI_MODELS`). Falls back to the SDK default if unknown. */
export const ROADMAP_MODEL_ID = 'claude-sonnet-5-5'

/** Per-user quota: at most `max` roadmap generations per `windowMs`. */
export const ROADMAP_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 } as const

/** Give up on the model after this long. */
export const ROADMAP_TIMEOUT_MS = 45_000
