export const CATEGORIES = [
  'Web app',
  'Mobile app',
  'AI & data',
  'Game',
  'Design',
  'Hardware',
  'Dev tool',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

export const VISIBILITIES = ['public', 'private'] as const
export type Visibility = (typeof VISIBILITIES)[number]

export function isVisibility(value: unknown): value is Visibility {
  return value === 'public' || value === 'private'
}
