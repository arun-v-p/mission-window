import type { SpacecraftSpecifications } from '../types/mission'
import type {
  RejectedObservation,
  ScheduleResult,
  ScheduledObservation,
} from './scheduler'

export interface MissionObjectiveResult {
  id: string
  description: string
  completed: boolean
}

export interface OperationalFailure {
  id: string
  description: string
}

export interface MissionScoringInput {
  schedule: ScheduleResult
  completedObservationIds: string[]
  objectives: MissionObjectiveResult[]
  operationalFailures: OperationalFailure[]
  spacecraftSpecifications: SpacecraftSpecifications
  actualEnergyConsumptionWh?: number
  actualDataGeneratedMB?: number
}

export interface MissionCategoryScores {
  scientificAchievement: number
  missionObjectives: number
  resourceEfficiency: number
  operationalExecution: number
}

export type PerformanceGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface MissionScoreResult {
  valid: boolean
  categoryScores: MissionCategoryScores
  totalScore: number
  performanceGrade: PerformanceGrade
  explanations: string[]
  errors: string[]
}

export const MISSION_SCORING_WEIGHTS: Readonly<MissionCategoryScores> = {
  scientificAchievement: 40,
  missionObjectives: 25,
  resourceEfficiency: 20,
  operationalExecution: 15,
}

export const PERFORMANCE_GRADE_THRESHOLDS: Readonly<
  Array<{ minimumScore: number; grade: PerformanceGrade }>
> = [
  { minimumScore: 90, grade: 'A' },
  { minimumScore: 80, grade: 'B' },
  { minimumScore: 70, grade: 'C' },
  { minimumScore: 60, grade: 'D' },
  { minimumScore: 0, grade: 'F' },
]

const EMPTY_CATEGORY_SCORES: MissionCategoryScores = {
  scientificAchievement: 0,
  missionObjectives: 0,
  resourceEfficiency: 0,
  operationalExecution: 0,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeFinite(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  )
}

function isScheduledObservation(
  value: unknown,
): value is ScheduledObservation {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.observationId === 'string' &&
    value.observationId.trim().length > 0 &&
    isNonNegativeFinite(value.startMinute) &&
    isNonNegativeFinite(value.endMinute) &&
    value.endMinute >= value.startMinute &&
    isNonNegativeFinite(value.energyConsumptionWh) &&
    isNonNegativeFinite(value.dataGeneratedMB) &&
    isNonNegativeFinite(value.scienceValue)
  )
}

function isRejectedObservation(value: unknown): value is RejectedObservation {
  return (
    isRecord(value) &&
    typeof value.observationId === 'string' &&
    value.observationId.trim().length > 0 &&
    typeof value.reason === 'string' &&
    value.reason.trim().length > 0
  )
}

function isObjectiveResult(value: unknown): value is MissionObjectiveResult {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.description === 'string' &&
    value.description.trim().length > 0 &&
    typeof value.completed === 'boolean'
  )
}

function isOperationalFailure(value: unknown): value is OperationalFailure {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.description === 'string' &&
    value.description.trim().length > 0
  )
}

function isSpacecraftSpecifications(
  value: unknown,
): value is SpacecraftSpecifications {
  if (!isRecord(value)) {
    return false
  }

  return [
    value.totalMass,
    value.totalCost,
    value.batteryCapacity,
    value.solarGeneration,
    value.totalInstrumentPower,
    value.communicationRate,
    value.storageCapacity,
    value.totalScienceValue,
  ].every(isNonNegativeFinite)
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100
}

function getPerformanceGrade(score: number): PerformanceGrade {
  return (
    PERFORMANCE_GRADE_THRESHOLDS.find(
      (threshold) => score >= threshold.minimumScore,
    )?.grade ?? 'F'
  )
}

function createInvalidResult(errors: string[]): MissionScoreResult {
  return {
    valid: false,
    categoryScores: { ...EMPTY_CATEGORY_SCORES },
    totalScore: 0,
    performanceGrade: 'F',
    explanations: ['Scoring could not be completed because mission results are invalid.'],
    errors,
  }
}

function addFinite(
  total: number,
  value: number,
  name: string,
  errors: string[],
): number {
  const updatedTotal = total + value
  if (!isNonNegativeFinite(updatedTotal)) {
    errors.push(`${name} total exceeds the supported numeric range.`)
    return total
  }
  return updatedTotal
}

/**
 * Scores completed mission results; scheduled observations alone earn no science credit.
 */
export function calculateMissionScore(
  input: MissionScoringInput,
): MissionScoreResult {
  if (!isRecord(input) || !isRecord(input.schedule)) {
    return createInvalidResult(['Mission scoring input or schedule is invalid.'])
  }

  const schedule = input.schedule
  const errors: string[] = []
  if (typeof schedule.valid !== 'boolean') {
    errors.push('Schedule validity status is invalid.')
  } else if (!schedule.valid) {
    errors.push('Schedule is marked invalid.')
  }
  if (!Array.isArray(schedule.errors)) {
    errors.push('Schedule error list is invalid.')
  } else {
    for (const error of schedule.errors) {
      if (typeof error !== 'string' || error.trim().length === 0) {
        errors.push('Schedule contains an invalid error message.')
      } else {
        errors.push(`Schedule error: ${error}`)
      }
    }
  }

  if (
    !Array.isArray(schedule.scheduledObservations) ||
    !Array.isArray(schedule.rejectedObservations)
  ) {
    return createInvalidResult([
      ...errors,
      'Schedule must contain scheduled and rejected observation lists.',
    ])
  }

  const scheduledObservations: ScheduledObservation[] = []
  const scheduledIds = new Set<string>()
  for (const candidate of schedule.scheduledObservations) {
    if (!isScheduledObservation(candidate)) {
      errors.push('Schedule contains an invalid scheduled observation.')
      continue
    }
    if (scheduledIds.has(candidate.observationId)) {
      errors.push(
        `Schedule contains duplicate observation ID "${candidate.observationId}".`,
      )
      continue
    }
    scheduledIds.add(candidate.observationId)
    scheduledObservations.push(candidate)
  }

  const rejectedObservations: RejectedObservation[] = []
  const rejectedIds = new Set<string>()
  for (const candidate of schedule.rejectedObservations) {
    if (!isRejectedObservation(candidate)) {
      errors.push(
        'Rejected observations must have non-empty IDs and rejection reasons.',
      )
      continue
    }
    if (rejectedIds.has(candidate.observationId)) {
      errors.push(
        `Schedule contains duplicate rejected observation ID "${candidate.observationId}".`,
      )
      continue
    }
    rejectedIds.add(candidate.observationId)
    rejectedObservations.push(candidate)
  }

  const scheduleTotals = [
    schedule.totalDurationMinutes,
    schedule.totalEnergyConsumptionWh,
    schedule.totalDataGeneratedMB,
    schedule.totalScienceValue,
    schedule.remainingMissionTimeMinutes,
  ]
  if (!scheduleTotals.every(isNonNegativeFinite)) {
    errors.push('Schedule contains negative or non-finite totals.')
  }

  if (errors.length > 0) {
    return createInvalidResult(errors)
  }

  if (!isSpacecraftSpecifications(input.spacecraftSpecifications)) {
    return createInvalidResult([
      ...errors,
      'Spacecraft specifications contain negative or non-finite values.',
    ])
  }
  if (
    (input.actualEnergyConsumptionWh !== undefined &&
      !isNonNegativeFinite(input.actualEnergyConsumptionWh)) ||
    (input.actualDataGeneratedMB !== undefined &&
      !isNonNegativeFinite(input.actualDataGeneratedMB))
  ) {
    return createInvalidResult([
      ...errors,
      'Actual resource consumption values must be non-negative and finite.',
    ])
  }

  const completedIds = new Set<string>()
  const completedObservations: ScheduledObservation[] = []
  if (!Array.isArray(input.completedObservationIds)) {
    errors.push('Completed observation IDs must be provided as a list.')
  } else {
    for (const completedId of input.completedObservationIds) {
      if (typeof completedId !== 'string' || completedId.length === 0) {
        errors.push('Completed observation IDs must be non-empty strings.')
        continue
      }
      if (completedIds.has(completedId)) {
        errors.push(`Observation "${completedId}" is marked complete more than once.`)
        continue
      }
      completedIds.add(completedId)

      const observation = scheduledObservations.find(
        (scheduled) => scheduled.observationId === completedId,
      )
      if (!observation) {
        errors.push(
          `Observation "${completedId}" was not scheduled and cannot earn completion credit.`,
        )
        continue
      }
      completedObservations.push(observation)
    }
  }

  const objectives: MissionObjectiveResult[] = []
  const objectiveIds = new Set<string>()
  if (!Array.isArray(input.objectives)) {
    errors.push('Mission objectives must be provided as a list.')
  } else {
    for (const candidate of input.objectives) {
      if (!isObjectiveResult(candidate)) {
        errors.push('Mission contains an invalid objective result.')
        continue
      }
      if (objectiveIds.has(candidate.id)) {
        errors.push(`Mission objective "${candidate.id}" appears more than once.`)
        continue
      }
      objectiveIds.add(candidate.id)
      objectives.push(candidate)
    }
  }

  const operationalFailures: OperationalFailure[] = []
  const failureIds = new Set<string>()
  if (!Array.isArray(input.operationalFailures)) {
    errors.push('Operational failures must be provided as a list.')
  } else {
    for (const candidate of input.operationalFailures) {
      if (!isOperationalFailure(candidate)) {
        errors.push('Mission contains an invalid operational failure.')
        continue
      }
      if (failureIds.has(candidate.id)) {
        errors.push(`Operational failure "${candidate.id}" appears more than once.`)
        continue
      }
      failureIds.add(candidate.id)
      operationalFailures.push(candidate)
    }
  }

  if (errors.length > 0) {
    return createInvalidResult(errors)
  }

  let plannedScienceValue = 0
  for (const observation of scheduledObservations) {
    plannedScienceValue = addFinite(
      plannedScienceValue,
      observation.scienceValue,
      'Planned science value',
      errors,
    )
  }

  let completedScienceValue = 0
  let completedEnergyConsumptionWh = 0
  let completedDataGeneratedMB = 0
  for (const observation of completedObservations) {
    completedScienceValue = addFinite(
      completedScienceValue,
      observation.scienceValue,
      'Completed science value',
      errors,
    )
    completedEnergyConsumptionWh = addFinite(
      completedEnergyConsumptionWh,
      observation.energyConsumptionWh,
      'Completed energy consumption',
      errors,
    )
    completedDataGeneratedMB = addFinite(
      completedDataGeneratedMB,
      observation.dataGeneratedMB,
      'Completed data generation',
      errors,
    )
  }

  if (errors.length > 0) {
    return createInvalidResult(errors)
  }

  const plannedScienceRatio =
    plannedScienceValue > 0
      ? clampRatio(completedScienceValue / plannedScienceValue)
      : 0
  const completedObjectiveCount = objectives.filter(
    (objective) => objective.completed,
  ).length
  const objectiveRatio =
    objectives.length > 0
      ? clampRatio(completedObjectiveCount / objectives.length)
      : 0

  const batteryEfficiency =
    input.spacecraftSpecifications.batteryCapacity > 0
      ? clampRatio(
          1 -
            (input.actualEnergyConsumptionWh ??
              completedEnergyConsumptionWh) /
              input.spacecraftSpecifications.batteryCapacity,
        )
      : 0
  const storageEfficiency =
    input.spacecraftSpecifications.storageCapacity > 0
      ? clampRatio(
          1 -
            (input.actualDataGeneratedMB ?? completedDataGeneratedMB) /
              input.spacecraftSpecifications.storageCapacity,
        )
      : 0

  const executionDenominator =
    scheduledObservations.length +
    rejectedObservations.length +
    operationalFailures.length
  const executionRatio =
    executionDenominator > 0
      ? clampRatio(completedObservations.length / executionDenominator)
      : 0

  const categoryScores: MissionCategoryScores = {
    scientificAchievement: roundScore(
      plannedScienceRatio * MISSION_SCORING_WEIGHTS.scientificAchievement,
    ),
    missionObjectives: roundScore(
      objectiveRatio * MISSION_SCORING_WEIGHTS.missionObjectives,
    ),
    resourceEfficiency: roundScore(
      ((batteryEfficiency + storageEfficiency) / 2) *
        MISSION_SCORING_WEIGHTS.resourceEfficiency,
    ),
    operationalExecution: roundScore(
      executionRatio * MISSION_SCORING_WEIGHTS.operationalExecution,
    ),
  }

  const categoryScoreValues = Object.values(categoryScores)
  if (
    !categoryScoreValues.every(
      (score) => isNonNegativeFinite(score) && score <= 100,
    )
  ) {
    return createInvalidResult([
      'Calculated category scores are negative, non-finite, or above 100.',
    ])
  }

  const unboundedTotalScore = categoryScoreValues.reduce(
    (total, score) => total + score,
    0,
  )
  if (!isNonNegativeFinite(unboundedTotalScore)) {
    return createInvalidResult(['Calculated total score is not finite.'])
  }
  const totalScore = roundScore(Math.min(100, unboundedTotalScore))
  if (!isNonNegativeFinite(totalScore) || totalScore > 100) {
    return createInvalidResult([
      'Calculated total score is negative, non-finite, or above 100.',
    ])
  }

  const explanations = [
    `Scientific achievement: ${completedScienceValue} of ${plannedScienceValue} planned science-value points came from completed observations.`,
    `Mission objectives: ${completedObjectiveCount} of ${objectives.length} objectives were completed.`,
    `Resource efficiency: completed observations used ${completedEnergyConsumptionWh} Wh of ${input.spacecraftSpecifications.batteryCapacity} Wh battery capacity and generated ${completedDataGeneratedMB} MB of ${input.spacecraftSpecifications.storageCapacity} MB storage capacity.`,
    `Operational execution: ${completedObservations.length} observations completed, ${rejectedObservations.length} observations rejected, and ${operationalFailures.length} operational failures reported.`,
    'Performance grades are gameplay feedback and are not NASA scoring standards.',
  ]

  return {
    valid: errors.length === 0,
    categoryScores,
    totalScore,
    performanceGrade: getPerformanceGrade(totalScore),
    explanations,
    errors,
  }
}