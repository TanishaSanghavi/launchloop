import type { CollectionSchema } from 'deepspace/schema'
import { CATEGORIES } from '../lib/categories'
import { LIMITS } from '../lib/limits'

/**
 * One row per project. The row's CREATOR is the owner (`createdBy` is stamped by
 * the server, so a client cannot claim someone else's id).
 *
 * Permissions are evaluated inside the Durable Object before data is sent or
 * written — the UI cannot bypass them:
 *   read   'published' → the owner, OR anyone signed in when visibility = 'public'
 *   update 'own'       → only the owner (this also protects the embedded milestones)
 *   delete 'own'       → only the owner
 * Admin (the app owner) can moderate everything. Signed-out visitors and the
 * 'viewer' role get nothing.
 *
 * Note: `maxLength` is enforced by the server; `select` options are NOT, so the
 * forms validate category/visibility on the client and the UI normalises
 * unknown values (see lib/projects.ts).
 */
export const projectsSchema: CollectionSchema = {
  name: 'projects',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true, maxLength: LIMITS.title },
    { name: 'description', storage: 'text', interpretation: 'plain', maxLength: LIMITS.description },
    {
      name: 'category',
      storage: 'text',
      interpretation: { kind: 'select', options: [...CATEGORIES] },
      maxLength: 30,
    },
    { name: 'goal', storage: 'text', interpretation: 'plain', maxLength: LIMITS.goal },
    {
      name: 'visibility',
      storage: 'text',
      interpretation: { kind: 'select', options: ['public', 'private'] },
      default: 'public',
      maxLength: 10,
    },
    { name: 'summary', storage: 'text', interpretation: 'plain', maxLength: LIMITS.summary },
    { name: 'startingPoint', storage: 'text', interpretation: 'plain', maxLength: LIMITS.startingPoint },
    // JSON array of milestones (see lib/milestones.ts). No maxLength: the server's
    // length check only applies to string values.
    { name: 'milestones', storage: 'text', interpretation: { kind: 'json' } },
  ],
  visibilityField: { field: 'visibility', value: 'public' },
  permissions: {
    admin: { read: true, create: true, update: true, delete: true },
    member: { read: 'published', create: true, update: 'own', delete: 'own' },
    viewer: { read: false, create: false, update: false, delete: false },
  },
}
