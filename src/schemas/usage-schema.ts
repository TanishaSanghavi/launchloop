import type { CollectionSchema } from 'deepspace/schema'

/**
 * Per-user AI quota counter. Written ONLY by the `generateRoadmap` server
 * action (which bypasses RBAC); members cannot read or write it, so nobody can
 * reset their own limit. The record's id is the user's id: one row per user.
 */
export const aiUsageSchema: CollectionSchema = {
  name: 'ai_usage',
  columns: [
    { name: 'windowStart', storage: 'number', interpretation: 'plain' },
    { name: 'count', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    admin: { read: true, create: false, update: false, delete: false },
    member: { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
  },
}
