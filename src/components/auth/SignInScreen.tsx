import { useNavigate } from 'react-router-dom'
import { AuthOverlay } from 'deepspace'
import { Logo } from '../brand/Logo'
import { ProgressRing } from '../brand/ProgressRing'

/**
 * The authentication screen. Sign-in itself is DeepSpace's own <AuthOverlay>
 * (Better Auth under the hood: GitHub and Google OAuth) — we only brand it and
 * put it over a page that explains what the person is signing in to. We never
 * handle credentials or sessions ourselves.
 */
export function SignInScreen() {
  const navigate = useNavigate()
  return (
    <div className="relative flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <ProgressRing percent={78} size={132} showValue={false} />
      <h1 className="mt-8 max-w-md text-3xl font-semibold sm:text-4xl">Turn ideas into finished projects.</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">Sign in to plan your project, track milestones and share it with other builders.</p>
      <AuthOverlay
        providers={['github', 'google']}
        title="Sign in to LaunchLoop"
        description="Use your GitHub or Google account."
        logo={<Logo className="justify-center" />}
        onClose={() => navigate('/')}
      />
    </div>
  )
}
