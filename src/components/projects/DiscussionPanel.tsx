import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { MessageSquare, Send, Trash2 } from 'lucide-react'
import { useAuth, useMessages } from 'deepspace'
import { LIMITS } from '../../lib/limits'
import { fullDate, timeAgo } from '../../lib/time'
import { usePeople } from '../../lib/use-people'
import { cn } from '../../lib/utils'
import { Avatar, AvatarFallback, AvatarImage, Button, EmptyState, Textarea, useToast } from '../ui'

/**
 * Project discussion, built on DeepSpace messaging: `useMessages(channelId)` is
 * a live query over the `messages` collection, so new messages from other people
 * appear without a refresh. We use the project's record id as the channel id —
 * no channel records are needed. See schemas/messages-schema.ts for the
 * server-side rules (length cap, author stamped by the server).
 */
export function DiscussionPanel({ projectId }: { projectId: string }) {
  const { userId } = useAuth()
  const people = usePeople()
  const toast = useToast()
  const { messages, status, send, remove } = useMessages(projectId)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [, setTick] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  // Keep "5m ago" labels fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Follow new messages, unless the reader has scrolled up to read history.
  useEffect(() => {
    const el = listRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages.length, status])

  const over = draft.length > LIMITS.message
  const canSend = draft.trim().length > 0 && !over && !sending

  async function submit() {
    if (!canSend) return
    const text = draft.trim()
    setSending(true)
    stickToBottom.current = true
    setDraft('') // clear right away; restored below if the send fails
    const restore = () => setDraft((current) => (current === '' ? text : current))
    try {
      const pending = send(text)
      if (!pending) {
        restore()
        toast.warning('Still connecting', 'Give it a second and send again.')
      } else {
        await pending
      }
    } catch (err) {
      restore()
      toast.error('Message not sent', err instanceof Error ? err.message : undefined)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <section aria-label="Project discussion" className="flex flex-col rounded-2xl border border-border bg-card">
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="max-h-[28rem] min-h-[16rem] overflow-y-auto p-4 sm:p-5"
        aria-live="polite"
        aria-busy={status === 'loading'}
      >
        {status === 'loading' ? (
          <div className="space-y-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          <EmptyState icon={<MessageSquare />} title="Couldn't load the discussion" description="Check your connection and reload the page." />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare />}
            title="No messages yet"
            description="Start the conversation: ask for feedback, share a blocker, or post an update."
          />
        ) : (
          <ul className="space-y-5">
            {messages.map((m) => {
              const author = people(m.data.authorId)
              const mine = m.data.authorId === userId
              return (
                <li key={m.recordId} className="message-in flex gap-3">
                  <Avatar className="h-8 w-8 text-xs">
                    <AvatarImage src={author.imageUrl} referrerPolicy="no-referrer" />
                    <AvatarFallback>{(author.name[0] ?? '?').toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2 text-sm">
                      <span className={cn('font-medium', mine && 'text-loop')}>{author.label}</span>
                      <time dateTime={m.createdAt} title={fullDate(m.createdAt)} className="text-xs text-muted-foreground">
                        {timeAgo(m.createdAt)}
                      </time>
                    </p>
                    {m.data.deleted ? (
                      <p className="mt-0.5 text-sm italic text-muted-foreground">Message deleted</p>
                    ) : (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{m.data.content}</p>
                    )}
                  </div>
                  {mine && !m.data.deleted && (
                    <button
                      type="button"
                      onClick={() => remove(m.recordId)}
                      aria-label="Delete your message"
                      title="Delete your message"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="border-t border-border p-3 sm:p-4"
      >
        <label htmlFor="discussion-message" className="sr-only">
          Write a message
        </label>
        <div className="flex items-end gap-2">
          <Textarea
            id="discussion-message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Write a message. Enter sends, Shift+Enter adds a new line."
            className="min-h-[3.25rem] resize-none"
            aria-invalid={over}
          />
          <Button type="submit" size="icon" disabled={!canSend} loading={sending} aria-label="Send message">
            {!sending && <Send aria-hidden="true" />}
          </Button>
        </div>
        {draft.length > LIMITS.message * 0.85 && (
          <p className={cn('mt-1.5 text-right text-xs tabular-nums', over ? 'text-[#f87171]' : 'text-muted-foreground')}>
            {draft.length}/{LIMITS.message}
          </p>
        )}
      </form>
    </section>
  )
}
