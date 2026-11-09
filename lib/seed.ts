import type { WorkState } from './types'

export const FOUNDER_ID = 'm-founder'

// Real state: starts empty. All data is entered by the user via the Data Manager
// and persisted to localStorage — no hardcoded mock projects/tasks/decisions.
export function buildSeed(): WorkState {
  return {
    members: [
      { id: FOUNDER_ID, name: 'Bạn (Founder)', role: 'CEO', capacity: 8, load: 0 },
    ],
    projects: [],
    tasks: [],
    decisions: [],
    audit: [],
    personalViews: [],
  }
}
