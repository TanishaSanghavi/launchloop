/**
 * Landing page — a STATIC page (top level of src/pages/): no DeepSpace
 * providers, so no auth fetch and no realtime socket on load. It is prerendered
 * to HTML at build time, so keep it renderable without a browser: no
 * window/document during render, animation via CSS keyframes only.
 */

import { Link } from 'react-router-dom'
import { Check, MessagesSquare, Sparkles, Target, Users } from 'lucide-react'
import { Seo } from '../components/Seo'
import { Logo } from '../components/brand/Logo'
import { ProgressRing } from '../components/brand/ProgressRing'
import { seo } from '../seo'

const primaryButton =
  'inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
const secondaryButton =
  'inline-flex h-11 items-center justify-center rounded-lg border border-input px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** An illustrative project, shown in the hero. It is labelled as an example on the page. */
const EXAMPLE_MILESTONES = [
  { title: 'Paper prototype of the ride-request flow', done: true },
  { title: 'Post and browse rides', done: true },
  { title: 'Sign in with a campus email', done: true },
  { title: 'Match riders with drivers', done: false },
  { title: 'Run a beta with 20 students', done: false },
]

const STEPS = [
  {
    title: 'Describe the idea',
    body: 'Write what you want to build. LaunchLoop drafts a roadmap of three to five milestones with priorities and time estimates, and tells you where to start.',
  },
  {
    title: 'Close the loop, one milestone at a time',
    body: 'Edit the plan, tick milestones off, and watch the ring fill. Finishing the last one closes the loop.',
  },
  {
    title: 'Share it and get feedback',
    body: 'Publish the project to the community. Other builders can follow your progress and talk it through with you in a project discussion.',
  },
]

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI roadmaps you review first',
    body: 'Nothing is saved until you have read, edited and approved the roadmap.',
  },
  {
    icon: Target,
    title: 'Progress you can see',
    body: 'Every project shows how many milestones are done, on its card and on its page.',
  },
  {
    icon: Users,
    title: 'A community of builders',
    body: 'Search and filter public projects by category, and see who is making what.',
  },
  {
    icon: MessagesSquare,
    title: 'Discussions per project',
    body: 'Ask for feedback or post an update. Messages arrive in real time.',
  },
]

const PLATFORM = [
  ['Sign-in', 'DeepSpace authentication'],
  ['Projects and milestones', 'DeepSpace records'],
  ['Discussions', 'DeepSpace messaging'],
  ['Roadmaps', 'DeepSpace AI'],
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="relative overflow-hidden">
        {/* A single oversized ring behind the hero: the brand idea, kept quiet. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-48 -top-48 hidden h-[44rem] w-[44rem] text-border lg:block"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.25" />
          <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="0.25" />
        </svg>

        <header className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="LaunchLoop home" className="rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <Link to="/community" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              Community
            </Link>
            <Link to="/sign-in" className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link to="/dashboard" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Start a project
            </Link>
          </nav>
        </header>

        <main>
          {/* Hero */}
          <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-28 lg:pt-20">
            <div>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
                Turn ideas into finished projects.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Most side projects stall because the next step is never clear. LaunchLoop breaks yours into milestones you can finish,
                tracks your progress, and puts it in front of other builders who will tell you what they think.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/dashboard" className={primaryButton}>
                  Start a project
                </Link>
                <Link to="/community" className={secondaryButton}>
                  Browse the community
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Sign in with GitHub or Google.</p>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Example project</p>
                    <h2 className="mt-1 text-xl font-semibold">Campus carpool app</h2>
                    <p className="mt-1 text-sm text-muted-foreground">3 of 5 milestones done</p>
                  </div>
                  <ProgressRing percent={60} size={104} intro />
                </div>
                <ul className="mt-6 space-y-2.5" aria-label="Example milestones">
                  {EXAMPLE_MILESTONES.map((m, i) => {
                    const isNext = !m.done && EXAMPLE_MILESTONES.findIndex((x) => !x.done) === i
                    return (
                      <li key={m.title} className="flex items-center gap-3 text-sm">
                        <span
                          aria-hidden="true"
                          className={
                            m.done
                              ? 'flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'
                              : isNext
                                ? 'size-5 shrink-0 rounded-full border-2 border-loop'
                                : 'size-5 shrink-0 rounded-full border border-input'
                          }
                        >
                          {m.done && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        <span className={m.done ? 'text-muted-foreground line-through decoration-muted-foreground/40' : 'text-foreground'}>
                          {m.title}
                        </span>
                        {isNext && <span className="ml-auto shrink-0 text-xs font-medium text-loop">Next up</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </section>

          {/* How it works: a real sequence, so the numbering is information */}
          <section aria-labelledby="how-heading" className="border-t border-border">
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
              <h2 id="how-heading" className="max-w-md text-3xl font-semibold sm:text-4xl">
                From idea to shipped in three steps
              </h2>
              <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="relative md:pr-6">
                    <span className="flex size-9 items-center justify-center rounded-full border border-input font-display text-sm font-semibold text-loop">
                      {i + 1}
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Features */}
          <section aria-labelledby="features-heading" className="border-t border-border">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
              <h2 id="features-heading" className="max-w-sm text-3xl font-semibold sm:text-4xl">
                Structure, accountability and feedback
              </h2>
              <ul className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
                {FEATURES.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-loop">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Platform transparency */}
          <section aria-labelledby="platform-heading" className="border-t border-border">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
              <h2 id="platform-heading" className="text-xl font-semibold">
                Built on the DeepSpace platform
              </h2>
              <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {PLATFORM.map(([what, how]) => (
                  <div key={what} className="border-l border-border pl-4">
                    <dt className="text-sm text-muted-foreground">{what}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">{how}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* Closing CTA */}
          <section className="border-t border-border">
            <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
              <h2 className="max-w-md text-3xl font-semibold">Pick the project you keep putting off.</h2>
              <Link to="/dashboard" className={primaryButton}>
                Start a project
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
            <Logo size={22} />
            <p>Built with the DeepSpace SDK.</p>
          </div>
        </footer>
      </div>
    </>
  )
}
