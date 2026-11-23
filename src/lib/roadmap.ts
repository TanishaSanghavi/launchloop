/**
 * Roadmap types shared by the server action (which generates and validates
 * them) and the UI (which reviews and saves them). Types only — the zod
 * validator lives server-side in src/actions/roadmap-generator.ts so zod is
 * not shipped to the browser.
 */

import type { MilestoneDraft, Priority } from './milestones'

export const TIMELINES = ['2 weeks', '1 month', '2 months', '3 months'] as const
export type Timeline = (typeof TIMELINES)[number]

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]

export interface RoadmapRequest {
  description: string
  title?: string
  timeline: Timeline
  experience: ExperienceLevel
}

export interface RoadmapMilestone {
  title: string
  details: string
  priority: Priority
  estimate: string
}

export interface Roadmap {
  summary: string
  startingPoint: string
  milestones: RoadmapMilestone[]
}

export function roadmapMilestonesToDrafts(milestones: readonly RoadmapMilestone[]): MilestoneDraft[] {
  return milestones.map((m) => ({
    title: m.title,
    details: m.details,
    priority: m.priority,
    estimate: m.estimate,
  }))
}
