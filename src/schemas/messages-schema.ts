import { MESSAGES_SCHEMA } from 'deepspace/schema'
import type { CollectionSchema } from 'deepspace/schema'
import { LIMITS } from '../lib/limits'

/**
 * Project discussions use DeepSpace's own messaging collection and the SDK's
 * `useMessages` hook — we do not build a messaging backend. A message's
 * `channelId` is the project's record id.
 *
 * We take the SDK schema and tighten it:
 *   - `content` is required and capped (the SDK default has no length limit)
 *   - signed-out and 'viewer' roles cannot read messages
 * `authorId` stays `userBound` + `immutable` from the SDK schema: the server
 * stamps it with the caller's id, so authors cannot be spoofed.
 *
 * Known limitation: any signed-in member can read the messages collection. That
 * is why discussions exist only for PUBLIC projects, and why making a project
 * private or deleting it clears its messages (see actions/project-actions.ts).
 */
export const messagesSchema: CollectionSchema = {
  ...MESSAGES_SCHEMA,
  columns: MESSAGES_SCHEMA.columns.map((column) =>
    column.name === 'content' ? { ...column, required: true, maxLength: LIMITS.message } : column,
  ),
  permissions: {
    ...MESSAGES_SCHEMA.permissions,
    viewer: { read: false, create: false, update: false, delete: false },
  },
}
