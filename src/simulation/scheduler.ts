import type {
  SpacecraftConfiguration,
  SpacecraftSpecifications,
} from '../types/mission'
import { instruments } from '../data/spacecraftOptions'
import {
  calculateDataGenerated,
  calculateEnergyConsumption,
  calculateSpacecraftSpecifications,
} from './calculations'

export interface ObservationOpportunity {
  id: string
  name: string
  description: string
  instrumentId: string
  durationMinutes: number
  opportunityOpensAtMinute: number
  opportunityClosesAtMinute: number
  scienceValue: number
}

export interface ScheduledObservation {
  observationId: string
  startMinute: number
  endMinute: number
  energyConsumptionWh: number
  dataGeneratedMB: number
  scienceValue: number
}

export interface RejectedObservation {
  observationId: string
  reason: string
}

export interface ScheduleResult {
  valid: boolean
  errors: string[]
  scheduledObservations: ScheduledObservation[]
  rejectedObservations: RejectedObservation[]
  totalDurationMinutes: number
  totalEnergyConsumptionWh: number
  totalDataGeneratedMB: number
  totalScienceValue: number
  remainingMissionTimeMinutes: number
}

export const DEFAULT_MISSION_WINDOW_DURATION_MINUTES = 12

function isNonNegativeFinite(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => typeof item === 'string')
  )
}

function isSpacecraftConfiguration(
  value: unknown,
): value is SpacecraftConfiguration {
  return (
    isRecord(value) &&
    typeof value.powerSystemId === 'string' &&
    typeof value.communicationSystemId === 'string' &&
    typeof value.storageSystemId === 'string' &&
    isStringArray(value.instrumentIds)
  )
}

function createScheduleResult(
  missionWindowDurationMinutes: number,
  errors: string[] = [],
  scheduledObservations: ScheduledObservation[] = [],
  rejectedObservations: RejectedObservation[] = [],
  totalDurationMinutes = 0,
  totalEnergyConsumptionWh = 0,
  totalDataGeneratedMB = 0,
  totalScienceValue = 0,
): ScheduleResult {
  const validWindow = isNonNegativeFinite(missionWindowDurationMinutes)
  const totalsAreValid = [
    totalDurationMinutes,
    totalEnergyConsumptionWh,
    totalDataGeneratedMB,
    totalScienceValue,
  ].every(isNonNegativeFinite)
  const remainingMissionTimeMinutes = validWindow && totalsAreValid
    ? missionWindowDurationMinutes - totalDurationMinutes
    : 0
  const remainingTimeIsValid = isNonNegativeFinite(remainingMissionTimeMinutes)
  const resultErrors = [...errors]

  if (!totalsAreValid) {
    resultErrors.push('Calculated schedule totals are invalid.')
  }
  if (validWindow && totalsAreValid && !remainingTimeIsValid) {
    resultErrors.push('Calculated remaining mission time is invalid.')
  }

  return {
    valid:
      resultErrors.length === 0 &&
      totalsAreValid &&
      remainingTimeIsValid,
    errors: resultErrors,
    scheduledObservations,
    rejectedObservations,
    totalDurationMinutes: totalsAreValid ? totalDurationMinutes : 0,
    totalEnergyConsumptionWh: totalsAreValid ? totalEnergyConsumptionWh : 0,
    totalDataGeneratedMB: totalsAreValid ? totalDataGeneratedMB : 0,
    totalScienceValue: totalsAreValid ? totalScienceValue : 0,
    remainingMissionTimeMinutes: remainingTimeIsValid
      ? remainingMissionTimeMinutes
      : 0,
  }
}

function isValidOpportunity(value: unknown): value is ObservationOpportunity {
  if (!isRecord(value)) {
    return false
  }

  const {
    durationMinutes,
    opportunityOpensAtMinute,
    opportunityClosesAtMinute,
    scienceValue,
  } = value

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.instrumentId === 'string' &&
    instruments.some((instrument) => instrument.id === value.instrumentId) &&
    isNonNegativeFinite(durationMinutes) &&
    isNonNegativeFinite(opportunityOpensAtMinute) &&
    isNonNegativeFinite(opportunityClosesAtMinute) &&
    opportunityOpensAtMinute <= opportunityClosesAtMinute &&
    isNonNegativeFinite(scienceValue)
  )
}

/**
 * Schedules observations in the exact order selected by the player.
 */
export function scheduleObservations(
  selectedObservationIds: string[],
  observationCatalogue: ObservationOpportunity[],
  spacecraftConfiguration: SpacecraftConfiguration,
  missionWindowDurationMinutes = DEFAULT_MISSION_WINDOW_DURATION_MINUTES,
): ScheduleResult {
  if (!Array.isArray(selectedObservationIds)) {
    return createScheduleResult(missionWindowDurationMinutes, [
      'Selected observation IDs must be provided as a list.',
    ])
  }

  if (!Array.isArray(observationCatalogue)) {
    return createScheduleResult(missionWindowDurationMinutes, [
      'Observation catalogue must be provided as a list.',
    ])
  }

  if (!isNonNegativeFinite(missionWindowDurationMinutes)) {
    return createScheduleResult(missionWindowDurationMinutes, [
      'Mission window duration must be a non-negative finite number of minutes.',
    ])
  }

  if (!isSpacecraftConfiguration(spacecraftConfiguration)) {
    return createScheduleResult(missionWindowDurationMinutes, [
      'Spacecraft configuration is invalid; provide valid component IDs and an instrument ID list.',
    ])
  }

  if (
    new Set(spacecraftConfiguration.instrumentIds).size !==
    spacecraftConfiguration.instrumentIds.length
  ) {
    return createScheduleResult(missionWindowDurationMinutes, [
      'Spacecraft configuration contains duplicate instrument IDs.',
    ])
  }

  let specifications: SpacecraftSpecifications
  try {
    specifications = calculateSpacecraftSpecifications(spacecraftConfiguration)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Invalid spacecraft configuration.'
    ) {
      return createScheduleResult(missionWindowDurationMinutes, [
        'Spacecraft configuration is invalid; select valid component options before scheduling observations.',
      ])
    }

    throw error
  }

  if (!isNonNegativeFinite(specifications.batteryCapacity)) {
    return createScheduleResult(missionWindowDurationMinutes, [
      'Spacecraft battery capacity is invalid.',
    ])
  }

  if (!isNonNegativeFinite(specifications.storageCapacity)) {
    return createScheduleResult(missionWindowDurationMinutes, [
      'Spacecraft storage capacity is invalid.',
    ])
  }

  const errors: string[] = []
  const observationsById = new Map<string, unknown[]>()
  for (const [index, candidate] of observationCatalogue.entries()) {
    if (!isRecord(candidate) || typeof candidate.id !== 'string') {
      errors.push(
        `Observation catalogue entry ${index + 1} has an invalid observation ID.`,
      )
      continue
    }

    const candidateId = candidate.id
    if (!isValidOpportunity(candidate)) {
      errors.push(
        `Observation catalogue entry "${candidateId}" has invalid details or negative/non-finite values.`,
      )
    }

    const matches = observationsById.get(candidateId) ?? []
    if (matches.length > 0) {
      errors.push(
        `Observation catalogue contains duplicate ID "${candidateId}".`,
      )
    }
    matches.push(candidate)
    observationsById.set(candidateId, matches)
  }

  const instrumentById = new Map(
    instruments.map((instrument) => [instrument.id, instrument]),
  )
  const seenObservationIds = new Set<string>()
  const scheduledObservations: ScheduledObservation[] = []
  const rejectedObservations: RejectedObservation[] = []
  const rejectionReasonsById = new Map<string, Set<string>>()
  const rejectObservation = (observationId: string, reason: string): void => {
    const existingReasons = rejectionReasonsById.get(observationId)
    if (existingReasons) {
      if (!existingReasons.has(reason)) {
        existingReasons.add(reason)
        const existing = rejectedObservations.find(
          (rejection) => rejection.observationId === observationId,
        )
        if (existing) {
          existing.reason = `${existing.reason} ${reason}`
        }
      }
      return
    }

    rejectionReasonsById.set(observationId, new Set([reason]))
    rejectedObservations.push({ observationId, reason })
  }

  let currentMinute = 0
  let totalEnergyConsumptionWh = 0
  let totalDataGeneratedMB = 0
  let totalScienceValue = 0

  for (const selectedId of selectedObservationIds) {
    if (typeof selectedId !== 'string') {
      errors.push('Selected observation IDs must be strings.')
      rejectObservation('[invalid observation ID]', 'Observation ID must be a string.')
      continue
    }

    if (selectedId.trim().length === 0) {
      errors.push('Selected observation IDs must not be empty.')
      rejectObservation(
        '[invalid observation ID]',
        'Observation ID must not be empty.',
      )
      continue
    }

    if (seenObservationIds.has(selectedId)) {
      rejectObservation(
        selectedId,
        'This observation was selected more than once.',
      )
      continue
    }
    seenObservationIds.add(selectedId)

    const matchingOpportunities = observationsById.get(selectedId)
    if (!matchingOpportunities || matchingOpportunities.length === 0) {
      rejectObservation(
        selectedId,
        'This observation is not in the observation catalogue.',
      )
      continue
    }

    if (matchingOpportunities.length > 1) {
      rejectObservation(
        selectedId,
        'This observation ID is duplicated in the observation catalogue.',
      )
      continue
    }

    const matchingOpportunity = matchingOpportunities[0]
    if (!isValidOpportunity(matchingOpportunity)) {
      rejectObservation(
        selectedId,
        'This observation has invalid details or negative/non-finite values.',
      )
      continue
    }
    const opportunity = matchingOpportunity

    if (!spacecraftConfiguration.instrumentIds.includes(opportunity.instrumentId)) {
      rejectObservation(
        selectedId,
        `Required instrument "${opportunity.instrumentId}" is not installed on the spacecraft.`,
      )
      continue
    }

    const instrument = instrumentById.get(opportunity.instrumentId)
    if (!instrument) {
      errors.push(
        `Observation "${selectedId}" references unavailable instrument "${opportunity.instrumentId}".`,
      )
      rejectObservation(
        selectedId,
        `Required instrument "${opportunity.instrumentId}" is not available.`,
      )
      continue
    }

    if (
      !isNonNegativeFinite(instrument.powerConsumption) ||
      !isNonNegativeFinite(instrument.dataRate)
    ) {
      errors.push(
        `Instrument "${opportunity.instrumentId}" has invalid power or data specifications.`,
      )
      rejectObservation(
        selectedId,
        'The required instrument has invalid power or data specifications.',
      )
      continue
    }

    const startMinute = Math.max(
      currentMinute,
      opportunity.opportunityOpensAtMinute,
    )
    const endMinute = startMinute + opportunity.durationMinutes
    if (!Number.isFinite(endMinute)) {
      errors.push(
        `Observation "${selectedId}" timing exceeds the supported numeric range.`,
      )
      rejectObservation(
        selectedId,
        'Observation timing exceeds the supported numeric range.',
      )
      continue
    }

    const timingErrors: string[] = []
    if (endMinute > opportunity.opportunityClosesAtMinute) {
      timingErrors.push(
        `it would finish at minute ${endMinute}, after the opportunity closes at minute ${opportunity.opportunityClosesAtMinute}`,
      )
    }
    if (endMinute > missionWindowDurationMinutes) {
      timingErrors.push(
        `it would finish at minute ${endMinute}, beyond the ${missionWindowDurationMinutes}-minute mission window`,
      )
    }
    if (timingErrors.length > 0) {
      rejectObservation(
        selectedId,
        `This observation cannot be scheduled because ${timingErrors.join(' and ')}.`,
      )
      continue
    }

    const energyConsumptionWh = calculateEnergyConsumption(
      instrument.powerConsumption,
      opportunity.durationMinutes,
    )
    const dataGeneratedMB = calculateDataGenerated(
      instrument.dataRate,
      opportunity.durationMinutes,
    )
    const nextEnergyConsumptionWh =
      totalEnergyConsumptionWh + energyConsumptionWh
    const nextDataGeneratedMB = totalDataGeneratedMB + dataGeneratedMB
    const nextScienceValue = totalScienceValue + opportunity.scienceValue

    if (
      !isNonNegativeFinite(energyConsumptionWh) ||
      !isNonNegativeFinite(dataGeneratedMB) ||
      !isNonNegativeFinite(nextEnergyConsumptionWh) ||
      !isNonNegativeFinite(nextDataGeneratedMB) ||
      !isNonNegativeFinite(nextScienceValue)
    ) {
      errors.push(
        `Observation "${selectedId}" resource calculations exceed the supported numeric range.`,
      )
      rejectObservation(
        selectedId,
        'Observation resource totals exceed the supported numeric range.',
      )
      continue
    }

    const resourceErrors: string[] = []
    if (nextEnergyConsumptionWh > specifications.batteryCapacity) {
      resourceErrors.push(
        `it would exceed battery capacity (${nextEnergyConsumptionWh} Wh required, ${specifications.batteryCapacity} Wh available)`,
      )
    }
    if (nextDataGeneratedMB > specifications.storageCapacity) {
      resourceErrors.push(
        `it would exceed storage capacity (${nextDataGeneratedMB} MB required, ${specifications.storageCapacity} MB available)`,
      )
    }
    if (resourceErrors.length > 0) {
      rejectObservation(
        selectedId,
        `This observation cannot be scheduled because ${resourceErrors.join(' and ')}.`,
      )
      continue
    }

    scheduledObservations.push({
      observationId: selectedId,
      startMinute,
      endMinute,
      energyConsumptionWh,
      dataGeneratedMB,
      scienceValue: opportunity.scienceValue,
    })
    currentMinute = endMinute
    totalEnergyConsumptionWh = nextEnergyConsumptionWh
    totalDataGeneratedMB = nextDataGeneratedMB
    totalScienceValue = nextScienceValue
  }

  return createScheduleResult(
    missionWindowDurationMinutes,
    errors,
    scheduledObservations,
    rejectedObservations,
    currentMinute,
    totalEnergyConsumptionWh,
    totalDataGeneratedMB,
    totalScienceValue,
  )
}