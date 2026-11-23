/**
 * Navigation Config — one entry per top-nav link. Routes themselves come from
 * file-based routing in src/pages/ (generouted); this only controls what the
 * nav bar shows.
 */

import type { Role } from './constants'

export interface NavItem {
  path: string
  label: string
  roles?: Role[]
  devOnly?: boolean
}

export const nav: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/community', label: 'Community' },
]
