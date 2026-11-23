/**
 * Theme catalog. LaunchLoop has a single dark theme; its colour values live in
 * src/styles.css (the @theme block). This file is metadata only.
 */

export const THEMES = [
  {
    id: 'launchloop',
    label: 'LaunchLoop',
    description: 'Deep navy surfaces with an indigo accent.',
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

/** Read the currently active theme id from <html data-theme>. */
export function getActiveTheme(): ThemeId {
  return 'launchloop'
}

/** Look up a theme entry by id, or fall back to the first theme. */
export function getTheme(id: string) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
