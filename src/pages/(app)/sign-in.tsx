/**
 * /sign-in — public (it lives under (app)/ but outside (protected)/). If the
 * visitor is already signed in they go straight to the dashboard.
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from 'deepspace'
import { SignInScreen } from '../../components/auth/SignInScreen'

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth()
  if (isLoaded && isSignedIn) return <Navigate to="/dashboard" replace />
  return (
    <>
      <title>Sign in · LaunchLoop</title>
      <SignInScreen />
    </>
  )
}
