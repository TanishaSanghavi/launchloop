import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants'
import { LogoMark } from '../components/brand/Logo'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <title>{`Not found · ${APP_NAME}`}</title>
      <meta name="robots" content="noindex" />
      <LogoMark size={44} />
      <h1 className="mt-6 text-3xl font-semibold text-foreground">This page isn&apos;t part of the loop</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">The link may be broken, or the project may have been removed.</p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go to your dashboard
      </Link>
    </div>
  )
}
