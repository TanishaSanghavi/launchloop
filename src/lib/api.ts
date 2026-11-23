import { getAuthToken } from 'deepspace'

export type ActionOutcome<T> = { ok: true; data: T } | { ok: false; error: string; code?: string }

/**
 * Calls a server action (src/actions) at POST /api/actions/:name with the
 * signed-in user's JWT. The worker verifies the token before the action runs;
 * the action itself then re-checks ownership (see actions/project-actions.ts).
 */
export async function callAction<T>(name: string, params: Record<string, unknown>): Promise<ActionOutcome<T>> {
  let token: string | null = null
  try {
    token = await getAuthToken()
  } catch {
    token = null
  }
  if (!token) return { ok: false, error: 'Your session has expired. Sign in again to continue.', code: 'unauthorized' }

  try {
    const res = await fetch(`/api/actions/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    })
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: T; error?: string; code?: string } | null
    if (body?.success === true) return { ok: true, data: body.data as T }
    if (res.status === 401) return { ok: false, error: 'Your session has expired. Sign in again to continue.', code: 'unauthorized' }
    return { ok: false, error: body?.error ?? `Something went wrong (${res.status}). Try again.`, code: body?.code }
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again.", code: 'network' }
  }
}
