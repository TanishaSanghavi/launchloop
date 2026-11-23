/**
 * Field limits shared by the collection schemas (server-enforced `maxLength`),
 * the forms (client-side hints) and the server actions. One source of truth so
 * the UI can never promise more than the server accepts.
 */
export const LIMITS = {
  title: 80,
  description: 2000,
  goal: 300,
  summary: 600,
  startingPoint: 300,
  milestoneTitle: 100,
  milestoneDetails: 300,
  estimate: 30,
  message: 2000,
  /** Milestones are embedded in the project row, so cap how many there can be. */
  maxMilestones: 30,
  /** Roadmap generator input. */
  roadmapDescriptionMin: 20,
} as const
