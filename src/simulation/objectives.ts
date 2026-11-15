import type { MissionObjectiveResult } from './scoring'
import type { ScheduleResult } from './scheduler'

export type MissionObjectiveDefinition =
  | {
      id: string
      description: string
      type: 'completed-observation-count'
      minimum: number
    }
  | {
      id: string
      description: string
      type: 'completed-observation-science-value'
      minimum: number
    }

/** Evaluates objective definitions from completed engine observations only. */
export function evaluateMissionObjectives(
  definitions: readonly MissionObjectiveDefinition[],
  schedule: ScheduleResult,
  completedObservationIds: readonly string[],
): MissionObjectiveResult[] {
  const completedIds = new Set(completedObservationIds)
  const completedObservations = schedule.scheduledObservations.filter(
    (observation) => completedIds.has(observation.observationId),
  )
  return definitions.map((definition) => ({
    id: definition.id,
    description: definition.description,
    completed:
      definition.type === 'completed-observation-count'
        ? completedObservations.length >= definition.minimum
        : completedObservations.some(
            (observation) => observation.scienceValue >= definition.minimum,
          ),
  }))
}
