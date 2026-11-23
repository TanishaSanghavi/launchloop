/**
 * Gated routes. Any file under src/pages/(app)/(protected)/ requires sign-in.
 * `(protected)` is a generouted route group — the parentheses keep it out of the
 * URL — and it is gated ONLY because this layout wraps its children in
 * <AuthGate>. Put new signed-in pages in this folder, never in a new group.
 *
 * Signed-out visitors see the branded sign-in screen instead of the page.
 */

import { Outlet } from 'react-router-dom'
import { AuthGate } from 'deepspace'
import { SignInScreen } from '../../../components/auth/SignInScreen'

export default function ProtectedLayout() {
  return (
    <AuthGate fallback={<SignInScreen />}>
      <Outlet />
    </AuthGate>
  )
}
