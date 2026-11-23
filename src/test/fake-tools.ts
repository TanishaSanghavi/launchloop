/**
 * In-memory stand-in for the server-action `tools` API, used by unit tests.
 * It mimics the pieces of behaviour the actions rely on: not-found errors,
 * the `createdBy` envelope field, upsert-by-id merge, and bounded deleteWhere.
 */
import { RECORD_NOT_FOUND } from 'deepspace/worker'
import type { ActionTools } from 'deepspace/worker'

export interface FakeRecord {
  data: Record<string, unknown>
  createdBy: string
}

export function createFakeTools(seed: Record<string, Record<string, FakeRecord>> = {}) {
  const db: Record<string, Record<string, FakeRecord>> = JSON.parse(JSON.stringify(seed))
  const calls: string[] = []
  let failNext: { method: string; error?: string } | null = null
  let counter = 0

  const guard = (method: string): { success: false; error: string } | null => {
    calls.push(method)
    if (failNext && failNext.method === method) {
      const error = failNext.error ?? 'boom'
      failNext = null
      return { success: false, error }
    }
    return null
  }

  const tools = {
    async get(collection: string, recordId: string) {
      const failure = guard('get')
      if (failure) return failure
      const rec = db[collection]?.[recordId]
      if (!rec) return { success: false as const, error: RECORD_NOT_FOUND }
      return {
        success: true as const,
        data: {
          record: { recordId, data: rec.data, createdBy: rec.createdBy, createdAt: 'x', updatedAt: 'x' },
        },
      }
    },
    async create(collection: string, data: Record<string, unknown>, recordId?: string) {
      const failure = guard('create')
      if (failure) return failure
      const id = recordId ?? `rec_${++counter}`
      const existing = db[collection]?.[id]
      db[collection] ??= {}
      db[collection][id] = { data: { ...(existing?.data ?? {}), ...data }, createdBy: existing?.createdBy ?? 'system' }
      return { success: true as const, data: { recordId: id } }
    },
    async update(collection: string, recordId: string, data: Record<string, unknown>) {
      const failure = guard('update')
      if (failure) return failure
      const rec = db[collection]?.[recordId]
      if (!rec) return { success: false as const, error: RECORD_NOT_FOUND }
      rec.data = { ...rec.data, ...data }
      return { success: true as const, data: { recordId } }
    },
    async remove(collection: string, recordId: string) {
      const failure = guard('remove')
      if (failure) return failure
      if (!db[collection]?.[recordId]) return { success: false as const, error: RECORD_NOT_FOUND }
      delete db[collection][recordId]
      return { success: true as const, data: { recordId } }
    },
    async deleteWhere(collection: string, where: Record<string, unknown>, limit = 100) {
      const failure = guard('deleteWhere')
      if (failure) return failure
      const ids = Object.entries(db[collection] ?? {})
        .filter(([, rec]) => Object.entries(where).every(([k, v]) => rec.data[k] === v))
        .map(([id]) => id)
        .slice(0, limit)
      for (const id of ids) delete db[collection][id]
      return { success: true as const, data: { deleted: ids.length } }
    },
    async query() {
      return { success: true as const, data: { records: [], count: 0 } }
    },
    async integration() {
      return { success: false as const, error: 'not used' }
    },
    async registerUser() {
      return { success: false as const, error: 'not used' }
    },
  }

  return {
    tools: tools as unknown as ActionTools,
    db,
    calls,
    failNext(method: string, error?: string) {
      failNext = { method, error }
    },
    count: (collection: string) => Object.keys(db[collection] ?? {}).length,
  }
}
