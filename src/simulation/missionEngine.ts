import { instruments } from '../data/spacecraftOptions'
import type { SpacecraftConfiguration } from '../types/mission'
import {
  calculateDataGenerated,
  calculateEnergyConsumption,
  calculateSpacecraftSpecifications,
} from './calculations'
import {
  DEFAULT_MISSION_WINDOW_DURATION_MINUTES,
  type ObservationOpportunity,
  type RejectedObservation,
  type ScheduleResult,
  type ScheduledObservation,
} from './scheduler'
import { applyMissionEvents } from './events'
import type {
  InstrumentFailurePeriod,
  MissionEvent,
  MissionEventEffect,
  MissionEventState,
  RejectedMissionEvent,
} from './events'
import { validateSpacecraftConfiguration } from './validator'
import type { OperationalFailure } from './scoring'

const FLOATING_POINT_TOLERANCE = 1e-9

export interface ActiveObservationExecution {
  observationId: string
  instrumentId: string
  startedAtMinute: number
  plannedEndMinute: number
  elapsedMinutes: number
  energyConsumedWh: number
  dataGeneratedMB: number
  energyConsumedAtStartWh: number
  dataGeneratedAtStartMB: number
}

export interface InterruptedObservation {
  observationId: string
  interruptedAtMinute: number
  energyConsumedWh: number
  dataGeneratedMB: number
  reason: string
}

export interface MissionEngineState {
  currentTimeMinute: number
  missionWindowDurationMinutes: number
  status: 'ready' | 'running' | 'completed'
  schedule: ScheduleResult
  nextScheduledObservationIndex: number
  activeObservation: ActiveObservationExecution | null
  missionEventState: MissionEventState
  missionEvents: MissionEvent[]
  rejectedMissionEvents: RejectedMissionEvent[]
  completedObservationIds: string[]
  interruptedObservations: InterruptedObservation[]
  operationalFailures: OperationalFailure[]
  actualEnergyConsumptionWh: number
  actualDataGeneratedMB: number
}

export interface MissionEngineInitializationInput {
  spacecraftConfiguration: SpacecraftConfiguration
  observationCatalogue: ObservationOpportunity[]
  missionEvents: MissionEvent[]
  schedule: ScheduleResult
  missionWindowDurationMinutes?: number
}

export interface MissionEngineInitializationResult {
  valid: boolean
  state: MissionEngineState | null
  errors: string[]
}

export interface MissionEngineAdvanceResult {
  valid: boolean
  state: MissionEngineState | null
  appliedEvents: MissionEvent[]
  rejectedEvents: RejectedMissionEvent[]
  messages: string[]
  errors: string[]
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

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function approximatelyEqual(left: number, right: number): boolean {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return false
  }

  return (
    Math.abs(left - right) <=
    FLOATING_POINT_TOLERANCE * Math.max(1, Math.abs(left), Math.abs(right))
  )
}

function isObservationOpportunity(
  value: unknown,
): value is ObservationOpportunity {
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

function isMissionEvent(value: unknown): value is MissionEvent {
  if (
    !isRecord(value) ||
    !isRecord(value.effect) ||
    typeof value.id !== 'string' ||
    value.id.trim().length === 0 ||
    typeof value.title !== 'string' ||
    value.title.trim().length === 0 ||
    typeof value.description !== 'string' ||
    value.description.trim().length === 0 ||
    !isNonNegativeFinite(value.triggerTimeMinute)
  ) {
    return false
  }

  const effect = value.effect
  switch (effect.type) {
    case 'SOLAR_GENERATION_REDUCTION':
      return (
        value.category === 'RESOURCE' &&
        isPositiveFinite(effect.reductionWatts)
      )
    case 'INSTRUMENT_POWER_INCREASE':
      return (
        value.category === 'RESOURCE' &&
        typeof effect.instrumentId === 'string' &&
        effect.instrumentId.trim().length > 0 &&
        isPositiveFinite(effect.increaseWatts)
      )
    case 'INSTRUMENT_FAILURE':
      return (
        value.category === 'EQUIPMENT' &&
        typeof effect.instrumentId === 'string' &&
        effect.instrumentId.trim().length > 0 &&
        isPositiveFinite(effect.durationMinutes)
      )
    case 'NEW_OBSERVATION':
      return (
        value.category === 'OPPORTUNITY' &&
        isObservationOpportunity(effect.observation)
      )
    default:
      return false
  }
}

function isRejectedMissionEvent(
  value: unknown,
): value is RejectedMissionEvent {
  return (
    isRecord(value) &&
    typeof value.eventId === 'string' &&
    value.eventId.trim().length > 0 &&
    typeof value.reason === 'string' &&
    value.reason.trim().length > 0
  )
}

function isScheduledObservation(
  value: unknown,
): value is ScheduledObservation {
  return (
    isRecord(value) &&
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

function isSpacecraftConfiguration(
  value: unknown,
): value is SpacecraftConfiguration {
  if (
    !isRecord(value) ||
    typeof value.powerSystemId !== 'string' ||
    typeof value.communicationSystemId !== 'string' ||
    typeof value.storageSystemId !== 'string' ||
    !Array.isArray(value.instrumentIds) ||
    !value.instrumentIds.every(
      (instrumentId: unknown): instrumentId is string =>
        typeof instrumentId === 'string',
    )
  ) {
    return false
  }

  const configuration: SpacecraftConfiguration = {
    powerSystemId: value.powerSystemId,
    communicationSystemId: value.communicationSystemId,
    storageSystemId: value.storageSystemId,
    instrumentIds: value.instrumentIds,
  }

  return (
    new Set(configuration.instrumentIds).size ===
      configuration.instrumentIds.length &&
    validateSpacecraftConfiguration(configuration).valid
  )
}

function isSpacecraftSpecifications(value: unknown): boolean {
  return (
    isRecord(value) &&
    [
      value.totalMass,
      value.totalCost,
      value.batteryCapacity,
      value.solarGeneration,
      value.totalInstrumentPower,
      value.communicationRate,
      value.storageCapacity,
      value.totalScienceValue,
    ].every(isNonNegativeFinite)
  )
}

function isInstrumentFailurePeriod(
  value: unknown,
): value is InstrumentFailurePeriod {
  return (
    isRecord(value) &&
    typeof value.instrumentId === 'string' &&
    isNonNegativeFinite(value.unavailableFromMinute) &&
    isPositiveFinite(value.unavailableUntilMinute) &&
    value.unavailableUntilMinute > value.unavailableFromMinute
  )
}

function isMissionEventState(value: unknown): value is MissionEventState {
  if (
    !isRecord(value) ||
    !isSpacecraftConfiguration(value.spacecraftConfiguration) ||
    !isSpacecraftSpecifications(value.spacecraftSpecifications) ||
    !Array.isArray(value.observationCatalogue) ||
    !value.observationCatalogue.every(isObservationOpportunity) ||
    !isRecord(value.instrumentPowerIncreasesWatts) ||
    !Array.isArray(value.instrumentFailurePeriods) ||
    !value.instrumentFailurePeriods.every(isInstrumentFailurePeriod) ||
    !Array.isArray(value.appliedEventIds) ||
    !value.appliedEventIds.every(
      (eventId: unknown) =>
        typeof eventId === 'string' && eventId.trim().length > 0,
    )
  ) {
    return false
  }

  const instrumentIds = new Set(
    value.spacecraftConfiguration.instrumentIds,
  )
  const catalogueIds = value.observationCatalogue.map(
    (observation) => observation.id,
  )

  return (
    new Set(catalogueIds).size === catalogueIds.length &&
    new Set(value.appliedEventIds).size === value.appliedEventIds.length &&
    Object.entries(value.instrumentPowerIncreasesWatts).every(
      ([instrumentId, increase]) =>
        instrumentIds.has(instrumentId) && isNonNegativeFinite(increase),
    ) &&
    value.instrumentFailurePeriods.every((failure) =>
      instrumentIds.has(failure.instrumentId),
    )
  )
}

function isScheduleResult(value: unknown): value is ScheduleResult {
  if (
    !isRecord(value) ||
    value.valid !== true ||
    !Array.isArray(value.errors) ||
    value.errors.length !== 0 ||
    !Array.isArray(value.scheduledObservations) ||
    !value.scheduledObservations.every(isScheduledObservation) ||
    !Array.isArray(value.rejectedObservations) ||
    !value.rejectedObservations.every(isRejectedObservation) ||
    !isNonNegativeFinite(value.totalDurationMinutes) ||
    !isNonNegativeFinite(value.totalEnergyConsumptionWh) ||
    !isNonNegativeFinite(value.totalDataGeneratedMB) ||
    !isNonNegativeFinite(value.totalScienceValue) ||
    !isNonNegativeFinite(value.remainingMissionTimeMinutes)
  ) {
    return false
  }

  const scheduledIds = value.scheduledObservations.map(
    (observation) => observation.observationId,
  )
  const rejectedIds = value.rejectedObservations.map(
    (observation) => observation.observationId,
  )

  return (
    new Set(scheduledIds).size === scheduledIds.length &&
    new Set(rejectedIds).size === rejectedIds.length
  )
}

function isActiveObservationExecution(
  value: unknown,
): value is ActiveObservationExecution | null {
  return (
    value === null ||
    (isRecord(value) &&
      typeof value.observationId === 'string' &&
      value.observationId.trim().length > 0 &&
      typeof value.instrumentId === 'string' &&
      value.instrumentId.trim().length > 0 &&
      isNonNegativeFinite(value.startedAtMinute) &&
      isNonNegativeFinite(value.plannedEndMinute) &&
      value.plannedEndMinute >= value.startedAtMinute &&
      isNonNegativeFinite(value.elapsedMinutes) &&
      isNonNegativeFinite(value.energyConsumedWh) &&
      isNonNegativeFinite(value.dataGeneratedMB) &&
      isNonNegativeFinite(value.energyConsumedAtStartWh) &&
      isNonNegativeFinite(value.dataGeneratedAtStartMB))
  )
}

function isMissionEngineState(value: unknown): value is MissionEngineState {
  if (!isRecord(value)) {
    return false
  }

  const currentTimeMinute = value.currentTimeMinute
  const missionWindowDurationMinutes = value.missionWindowDurationMinutes
  const nextScheduledObservationIndex = value.nextScheduledObservationIndex
  const status = value.status

  if (
    !isNonNegativeFinite(currentTimeMinute) ||
    !isPositiveFinite(missionWindowDurationMinutes) ||
    currentTimeMinute > missionWindowDurationMinutes ||
    (status !== 'ready' && status !== 'running' && status !== 'completed') ||
    !isScheduleResult(value.schedule) ||
    typeof nextScheduledObservationIndex !== 'number' ||
    !Number.isInteger(nextScheduledObservationIndex) ||
    nextScheduledObservationIndex < 0 ||
    nextScheduledObservationIndex >
      value.schedule.scheduledObservations.length ||
    !isActiveObservationExecution(value.activeObservation) ||
    !isMissionEventState(value.missionEventState) ||
    !Array.isArray(value.missionEvents) ||
    !value.missionEvents.every(isMissionEvent) ||
    !Array.isArray(value.rejectedMissionEvents) ||
    !value.rejectedMissionEvents.every(isRejectedMissionEvent) ||
    !Array.isArray(value.completedObservationIds) ||
    !value.completedObservationIds.every(
      (id: unknown) => typeof id === 'string' && id.trim().length > 0,
    ) ||
    !Array.isArray(value.interruptedObservations) ||
    !value.interruptedObservations.every(
      (observation: unknown) =>
        isRecord(observation) &&
        typeof observation.observationId === 'string' &&
        observation.observationId.trim().length > 0 &&
        isNonNegativeFinite(observation.interruptedAtMinute) &&
        isNonNegativeFinite(observation.energyConsumedWh) &&
        isNonNegativeFinite(observation.dataGeneratedMB) &&
        typeof observation.reason === 'string' &&
        observation.reason.trim().length > 0,
    ) ||
    !Array.isArray(value.operationalFailures) ||
    !value.operationalFailures.every(
      (failure: unknown) =>
        isRecord(failure) &&
        typeof failure.id === 'string' &&
        failure.id.trim().length > 0 &&
        typeof failure.description === 'string' &&
        failure.description.trim().length > 0,
    ) ||
    !isNonNegativeFinite(value.actualEnergyConsumptionWh) ||
    !isNonNegativeFinite(value.actualDataGeneratedMB) ||
    value.actualEnergyConsumptionWh >
      value.missionEventState.spacecraftSpecifications.batteryCapacity &&
    !approximatelyEqual(
      value.actualEnergyConsumptionWh,
      value.missionEventState.spacecraftSpecifications.batteryCapacity,
    ) ||
    value.actualDataGeneratedMB >
      value.missionEventState.spacecraftSpecifications.storageCapacity &&
    !approximatelyEqual(
      value.actualDataGeneratedMB,
      value.missionEventState.spacecraftSpecifications.storageCapacity,
    )
  ) {
    return false
  }

  const completedIds = value.completedObservationIds
  const eventIds = value.missionEvents.map((event) => event.id)
  const appliedEventIds = value.missionEventState.appliedEventIds
  const rejectedEventIds = value.rejectedMissionEvents.map(
    (event) => event.eventId,
  )
  const interruptedIds = value.interruptedObservations.map(
    (observation) => observation.observationId,
  )
  const catalogueIds = new Set(
    value.missionEventState.observationCatalogue.map(
      (observation) => observation.id,
    ),
  )

  if (
    new Set(completedIds).size !== completedIds.length ||
    new Set(interruptedIds).size !== interruptedIds.length ||
    new Set(eventIds).size !== eventIds.length ||
    new Set(rejectedEventIds).size !== rejectedEventIds.length ||
    appliedEventIds.some((eventId) => !eventIds.includes(eventId)) ||
    rejectedEventIds.some(
      (eventId) =>
        !eventIds.includes(eventId) || appliedEventIds.includes(eventId),
    ) ||
    value.missionEvents.some(
      (event) => event.triggerTimeMinute > missionWindowDurationMinutes,
    ) ||
    value.schedule.scheduledObservations.some(
      (observation) => !catalogueIds.has(observation.observationId),
    ) ||
    value.completedObservationIds.some((id) => !catalogueIds.has(id)) ||
    interruptedIds.some(
      (id) => !catalogueIds.has(id) || completedIds.includes(id),
    ) ||
    (value.activeObservation !== null &&
      (!catalogueIds.has(value.activeObservation.observationId) ||
        completedIds.includes(value.activeObservation.observationId) ||
        interruptedIds.includes(value.activeObservation.observationId) ||
        !value.missionEventState.spacecraftConfiguration.instrumentIds.includes(
          value.activeObservation.instrumentId,
        ) ||
        value.actualEnergyConsumptionWh <
          value.activeObservation.energyConsumedAtStartWh ||
        value.actualDataGeneratedMB <
          value.activeObservation.dataGeneratedAtStartMB ||
        !approximatelyEqual(
          value.actualEnergyConsumptionWh,
          value.activeObservation.energyConsumedAtStartWh +
            value.activeObservation.energyConsumedWh,
        ) ||
        !approximatelyEqual(
          value.actualDataGeneratedMB,
          value.activeObservation.dataGeneratedAtStartMB +
            value.activeObservation.dataGeneratedMB,
        )))
  ) {
    return false
  }

  if (status === 'ready') {
    return currentTimeMinute === 0 && value.activeObservation === null
  }
  if (status === 'running') {
    return (
      currentTimeMinute < missionWindowDurationMinutes &&
      (currentTimeMinute > 0 ||
        value.activeObservation !== null ||
        nextScheduledObservationIndex > 0)
    )
  }
  return currentTimeMinute === missionWindowDurationMinutes
}

function cloneMissionEventEffect(effect: MissionEventEffect): MissionEventEffect {
  if (effect.type === 'NEW_OBSERVATION') {
    return { ...effect, observation: { ...effect.observation } }
  }
  return { ...effect }
}

function cloneMissionEvent(event: MissionEvent): MissionEvent {
  return { ...event, effect: cloneMissionEventEffect(event.effect) }
}

function cloneMissionEngineState(state: MissionEngineState): MissionEngineState {
  return {
    ...state,
    schedule: {
      ...state.schedule,
      errors: [...state.schedule.errors],
      scheduledObservations: state.schedule.scheduledObservations.map(
        (observation) => ({ ...observation }),
      ),
      rejectedObservations: state.schedule.rejectedObservations.map(
        (observation) => ({ ...observation }),
      ),
    },
    activeObservation: state.activeObservation
      ? { ...state.activeObservation }
      : null,
    missionEventState: {
      spacecraftConfiguration: {
        ...state.missionEventState.spacecraftConfiguration,
        instrumentIds: [
          ...state.missionEventState.spacecraftConfiguration.instrumentIds,
        ],
      },
      spacecraftSpecifications: {
        ...state.missionEventState.spacecraftSpecifications,
      },
      observationCatalogue:
        state.missionEventState.observationCatalogue.map(
          (observation) => ({ ...observation }),
        ),
      instrumentPowerIncreasesWatts: {
        ...state.missionEventState.instrumentPowerIncreasesWatts,
      },
      instrumentFailurePeriods:
        state.missionEventState.instrumentFailurePeriods.map(
          (failure) => ({ ...failure }),
        ),
      appliedEventIds: [...state.missionEventState.appliedEventIds],
    },
    missionEvents: state.missionEvents.map(cloneMissionEvent),
    rejectedMissionEvents: state.rejectedMissionEvents.map(
      (event) => ({ ...event }),
    ),
    completedObservationIds: [...state.completedObservationIds],
    interruptedObservations: state.interruptedObservations.map(
      (observation) => ({ ...observation }),
    ),
    operationalFailures: state.operationalFailures.map(
      (failure) => ({ ...failure }),
    ),
  }
}

function createInvalidResult(errors: string[]): MissionEngineInitializationResult {
  return { valid: false, state: null, errors }
}

function createInvalidAdvanceResult(
  errors: string[],
): MissionEngineAdvanceResult {
  return {
    valid: false,
    state: null,
    appliedEvents: [],
    rejectedEvents: [],
    messages: [],
    errors,
  }
}

/**
 * Validates inputs and creates a fresh, not-yet-executing mission state.
 */
export function initializeMissionEngine(
  input: MissionEngineInitializationInput,
): MissionEngineInitializationResult {
  if (!isRecord(input)) {
    return createInvalidResult(['Mission initialization input is invalid.'])
  }

  const missionWindowDurationMinutes =
    input.missionWindowDurationMinutes === undefined
      ? DEFAULT_MISSION_WINDOW_DURATION_MINUTES
      : input.missionWindowDurationMinutes

  if (!isPositiveFinite(missionWindowDurationMinutes)) {
    return createInvalidResult([
      'Mission window duration must be a positive finite number of minutes.',
    ])
  }

  const configurationValidation = validateSpacecraftConfiguration(
    input.spacecraftConfiguration,
  )
  if (!configurationValidation.valid) {
    return createInvalidResult(configurationValidation.errors)
  }

  const spacecraftConfiguration = input.spacecraftConfiguration
  if (
    new Set(spacecraftConfiguration.instrumentIds).size !==
    spacecraftConfiguration.instrumentIds.length
  ) {
    return createInvalidResult([
      'Spacecraft configuration contains duplicate instrument IDs.',
    ])
  }

  const spacecraftSpecifications = calculateSpacecraftSpecifications(
    spacecraftConfiguration,
  )
  if (!Array.isArray(input.observationCatalogue)) {
    return createInvalidResult([
      'Observation catalogue must be provided as a list.',
    ])
  }
  if (!Array.isArray(input.missionEvents)) {
    return createInvalidResult(['Mission events must be provided as a list.'])
  }
  if (!isRecord(input.schedule)) {
    return createInvalidResult(['Schedule result is invalid.'])
  }

  const errors: string[] = []
  const catalogueById = new Map<string, ObservationOpportunity>()
  for (const [index, candidate] of input.observationCatalogue.entries()) {
    if (!isObservationOpportunity(candidate)) {
      errors.push(
        `Observation catalogue entry ${index + 1} is invalid.`,
      )
      continue
    }
    if (catalogueById.has(candidate.id)) {
      errors.push(
        `Observation catalogue contains duplicate ID "${candidate.id}".`,
      )
      continue
    }
    catalogueById.set(candidate.id, candidate)
  }

  const eventIds = new Set<string>()
  const eventObservationIds = new Set<string>()
  for (const [index, candidate] of input.missionEvents.entries()) {
    if (!isMissionEvent(candidate)) {
      errors.push(`Mission event ${index + 1} is invalid.`)
      continue
    }
    if (eventIds.has(candidate.id)) {
      errors.push(`Mission event ID "${candidate.id}" is duplicated.`)
      continue
    }
    eventIds.add(candidate.id)

    if (candidate.triggerTimeMinute > missionWindowDurationMinutes) {
      errors.push(
        `Mission event "${candidate.id}" triggers outside the mission window.`,
      )
    }

    const effect = candidate.effect
    if (
      (effect.type === 'INSTRUMENT_POWER_INCREASE' ||
        effect.type === 'INSTRUMENT_FAILURE') &&
      !spacecraftConfiguration.instrumentIds.includes(effect.instrumentId)
    ) {
      errors.push(
        `Mission event "${candidate.id}" references an instrument that is not installed.`,
      )
    } else if (effect.type === 'NEW_OBSERVATION') {
      if (
        !spacecraftConfiguration.instrumentIds.includes(
          effect.observation.instrumentId,
        )
      ) {
        errors.push(
          `Mission event "${candidate.id}" offers an observation requiring an uninstalled instrument.`,
        )
      }
      if (
        catalogueById.has(effect.observation.id) ||
        eventObservationIds.has(effect.observation.id)
      ) {
        errors.push(
          `Mission event "${candidate.id}" offers a duplicate observation ID "${effect.observation.id}".`,
        )
      }
      eventObservationIds.add(effect.observation.id)
    }
  }

  const schedule = input.schedule
  if (schedule.valid !== true) {
    errors.push('Schedule is not marked valid.')
  }
  if (
    !Array.isArray(schedule.errors) ||
    schedule.errors.length > 0 ||
    !schedule.errors.every(
      (error: unknown) =>
        typeof error === 'string' && error.trim().length > 0,
    )
  ) {
    errors.push('Schedule contains invalid or unresolved errors.')
  }
  if (
    !Array.isArray(schedule.scheduledObservations) ||
    !Array.isArray(schedule.rejectedObservations)
  ) {
    errors.push('Schedule must contain scheduled and rejected observation lists.')
  }

  const scheduledObservations: ScheduledObservation[] = []
  const scheduledIds = new Set<string>()
  let expectedEnergyConsumptionWh = 0
  let expectedDataGeneratedMB = 0
  let expectedScienceValue = 0
  if (Array.isArray(schedule.scheduledObservations)) {
    let previousEndMinute = 0
    for (const [index, candidate] of schedule.scheduledObservations.entries()) {
      if (!isScheduledObservation(candidate)) {
        errors.push(`Scheduled observation ${index + 1} is invalid.`)
        continue
      }
      if (scheduledIds.has(candidate.observationId)) {
        errors.push(
          `Schedule contains duplicate observation ID "${candidate.observationId}".`,
        )
        continue
      }
      scheduledIds.add(candidate.observationId)

      const opportunity = catalogueById.get(candidate.observationId)
      if (!opportunity) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" is missing from the catalogue.`,
        )
        continue
      }

      if (
        !spacecraftConfiguration.instrumentIds.includes(opportunity.instrumentId)
      ) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" requires an uninstalled instrument.`,
        )
        continue
      }

      const instrument = instruments.find(
        (item) => item.id === opportunity.instrumentId,
      )
      if (!instrument) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" references an unavailable instrument.`,
        )
        continue
      }

      const expectedStartMinute = Math.max(
        previousEndMinute,
        opportunity.opportunityOpensAtMinute,
      )
      const expectedEndMinute =
        expectedStartMinute + opportunity.durationMinutes
      const expectedObservationEnergyWh = calculateEnergyConsumption(
        instrument.powerConsumption,
        opportunity.durationMinutes,
      )
      const expectedObservationDataMB = calculateDataGenerated(
        instrument.dataRate,
        opportunity.durationMinutes,
      )

      if (
        !approximatelyEqual(
          candidate.endMinute - candidate.startMinute,
          opportunity.durationMinutes,
        )
      ) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" duration does not match the catalogue.`,
        )
      }
      if (
        !approximatelyEqual(candidate.startMinute, expectedStartMinute) ||
        !approximatelyEqual(candidate.endMinute, expectedEndMinute)
      ) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" start and end times do not match the scheduler timing rules.`,
        )
      }
      if (
        candidate.startMinute < opportunity.opportunityOpensAtMinute &&
        !approximatelyEqual(
          candidate.startMinute,
          opportunity.opportunityOpensAtMinute,
        )
      ) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" starts before its opportunity opens.`,
        )
      }
      if (
        candidate.endMinute > opportunity.opportunityClosesAtMinute &&
        !approximatelyEqual(
          candidate.endMinute,
          opportunity.opportunityClosesAtMinute,
        )
      ) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" ends after its opportunity closes.`,
        )
      }
      if (
        candidate.endMinute > missionWindowDurationMinutes ||
        expectedEndMinute > missionWindowDurationMinutes
      ) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" extends beyond the mission window.`,
        )
      }
      if (!approximatelyEqual(candidate.scienceValue, opportunity.scienceValue)) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" science value does not match the catalogue.`,
        )
      }
      if (
        !Number.isFinite(expectedObservationEnergyWh) ||
        !approximatelyEqual(
          candidate.energyConsumptionWh,
          expectedObservationEnergyWh,
        )
      ) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" energy estimate does not match its instrument and duration.`,
        )
      }
      if (
        !Number.isFinite(expectedObservationDataMB) ||
        !approximatelyEqual(
          candidate.dataGeneratedMB,
          expectedObservationDataMB,
        )
      ) {
        errors.push(
          `Scheduled observation "${candidate.observationId}" data estimate does not match its instrument and duration.`,
        )
      }

      previousEndMinute = expectedEndMinute
      expectedEnergyConsumptionWh += candidate.energyConsumptionWh
      expectedDataGeneratedMB += candidate.dataGeneratedMB
      expectedScienceValue += candidate.scienceValue
      scheduledObservations.push(candidate)
    }
  }

  const rejectedObservations: RejectedObservation[] = []
  const rejectedIds = new Set<string>()
  if (Array.isArray(schedule.rejectedObservations)) {
    for (const [index, candidate] of schedule.rejectedObservations.entries()) {
      if (!isRejectedObservation(candidate)) {
        errors.push(`Rejected observation ${index + 1} is invalid.`)
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
  }

  const expectedTotalDurationMinutes =
    scheduledObservations.length > 0
      ? scheduledObservations[scheduledObservations.length - 1].endMinute
      : 0
  const expectedRemainingMissionTimeMinutes =
    missionWindowDurationMinutes - expectedTotalDurationMinutes
  const scheduleTotals = [
    schedule.totalDurationMinutes,
    schedule.totalEnergyConsumptionWh,
    schedule.totalDataGeneratedMB,
    schedule.totalScienceValue,
    schedule.remainingMissionTimeMinutes,
    expectedEnergyConsumptionWh,
    expectedDataGeneratedMB,
    expectedScienceValue,
    expectedTotalDurationMinutes,
    expectedRemainingMissionTimeMinutes,
  ]
  if (!scheduleTotals.every(isNonNegativeFinite)) {
    errors.push('Schedule contains invalid totals or exceeds the mission window.')
  }
  if (
    isNonNegativeFinite(expectedTotalDurationMinutes) &&
    isNonNegativeFinite(expectedEnergyConsumptionWh) &&
    isNonNegativeFinite(expectedDataGeneratedMB) &&
    isNonNegativeFinite(expectedScienceValue) &&
    isNonNegativeFinite(expectedRemainingMissionTimeMinutes) &&
    (!approximatelyEqual(
      schedule.totalDurationMinutes,
      expectedTotalDurationMinutes,
    ) ||
      !approximatelyEqual(
        schedule.totalEnergyConsumptionWh,
        expectedEnergyConsumptionWh,
      ) ||
      !approximatelyEqual(
        schedule.totalDataGeneratedMB,
        expectedDataGeneratedMB,
      ) ||
      !approximatelyEqual(schedule.totalScienceValue, expectedScienceValue) ||
      !approximatelyEqual(
        schedule.remainingMissionTimeMinutes,
        expectedRemainingMissionTimeMinutes,
      ))
  ) {
    errors.push(
      'Schedule aggregate totals do not match its scheduled observations and mission window.',
    )
  }

  if (errors.length > 0) {
    return createInvalidResult(errors)
  }

  const missionEventState: MissionEventState = {
    spacecraftConfiguration: {
      ...spacecraftConfiguration,
      instrumentIds: [...spacecraftConfiguration.instrumentIds],
    },
    spacecraftSpecifications: { ...spacecraftSpecifications },
    observationCatalogue: input.observationCatalogue.map(
      (observation) => ({ ...observation }),
    ),
    instrumentPowerIncreasesWatts: {},
    instrumentFailurePeriods: [] satisfies InstrumentFailurePeriod[],
    appliedEventIds: [],
  }

  const clonedSchedule: ScheduleResult = {
    ...schedule,
    errors: [...schedule.errors],
    scheduledObservations: scheduledObservations.map(
      (observation) => ({ ...observation }),
    ),
    rejectedObservations: rejectedObservations.map(
      (observation) => ({ ...observation }),
    ),
  }

  const state: MissionEngineState = {
    currentTimeMinute: 0,
    missionWindowDurationMinutes,
    status: 'ready',
    schedule: clonedSchedule,
    nextScheduledObservationIndex: 0,
    activeObservation: null,
    missionEventState,
    missionEvents: input.missionEvents.map(cloneMissionEvent),
    rejectedMissionEvents: [],
    completedObservationIds: [],
    interruptedObservations: [],
    operationalFailures: [],
    actualEnergyConsumptionWh: 0,
    actualDataGeneratedMB: 0,
  }

  return { valid: true, state, errors: [] }
}

/**
 * Advances the mission clock, processes mission events, and executes the fixed
 * observation schedule.
 */
export function advanceMissionTo(
  state: MissionEngineState,
  targetMinute: number,
): MissionEngineAdvanceResult {
  if (!isNonNegativeFinite(targetMinute)) {
    return createInvalidAdvanceResult([
      'Target mission time must be a non-negative finite number of minutes.',
    ])
  }

  if (!isMissionEngineState(state)) {
    return createInvalidAdvanceResult(['Mission engine state is invalid.'])
  }

  if (state.status === 'completed') {
    return createInvalidAdvanceResult([
      'Mission is already completed and cannot be advanced further.',
    ])
  }

  if (targetMinute < state.currentTimeMinute) {
    return createInvalidAdvanceResult([
      'Target mission time cannot be earlier than the current mission time.',
    ])
  }

  const clampedTargetMinute = Math.min(
    targetMinute,
    state.missionWindowDurationMinutes,
  )
  const reachedMissionWindow = approximatelyEqual(
    clampedTargetMinute,
    state.missionWindowDurationMinutes,
  )
  const effectiveTargetMinute = reachedMissionWindow
    ? state.missionWindowDurationMinutes
    : clampedTargetMinute
  let status: MissionEngineState['status'] = state.status
  if (reachedMissionWindow) {
    status = 'completed'
  } else if (effectiveTargetMinute > 0) {
    status = 'running'
  } else if (state.status === 'ready') {
    status = 'ready'
  }

  const nextState = cloneMissionEngineState(state)
  const appliedEventIds = new Set(
    nextState.missionEventState.appliedEventIds,
  )
  const rejectedEventIds = new Set(
    nextState.rejectedMissionEvents.map((event) => event.eventId),
  )
  const dueEvents = nextState.missionEvents
    .map((event, index) => ({ event, index }))
    .filter(
      ({ event }) =>
        (event.triggerTimeMinute <= effectiveTargetMinute ||
          approximatelyEqual(
            event.triggerTimeMinute,
            effectiveTargetMinute,
          )) &&
        !appliedEventIds.has(event.id) &&
        !rejectedEventIds.has(event.id),
    )
    .sort((left, right) => {
      if (left.event.triggerTimeMinute !== right.event.triggerTimeMinute) {
        return left.event.triggerTimeMinute < right.event.triggerTimeMinute
          ? -1
          : 1
      }
      return left.index - right.index
    })

  const appliedEvents: MissionEvent[] = []
  const rejectedEvents: RejectedMissionEvent[] = []
  const messages: string[] = []
  let eventIndex = 0
  let currentTimeMinute = state.currentTimeMinute

  const isInstrumentUnavailable = (
    instrumentId: string,
    timeMinute: number,
  ): boolean =>
    nextState.missionEventState.instrumentFailurePeriods.some(
      (failure) =>
        failure.instrumentId === instrumentId &&
        (failure.unavailableFromMinute <= timeMinute ||
          approximatelyEqual(failure.unavailableFromMinute, timeMinute)) &&
        timeMinute < failure.unavailableUntilMinute &&
        !approximatelyEqual(timeMinute, failure.unavailableUntilMinute),
    )

  const recordInterruption = (
    observationId: string,
    interruptedAtMinute: number,
    energyConsumedWh: number,
    dataGeneratedMB: number,
    reason: string,
  ): void => {
    nextState.interruptedObservations.push({
      observationId,
      interruptedAtMinute,
      energyConsumedWh,
      dataGeneratedMB,
      reason,
    })
    nextState.activeObservation = null
  }

  const updateActiveResources = (timeMinute: number): string[] => {
    const activeObservation = nextState.activeObservation
    if (!activeObservation) {
      return []
    }

    const instrument = instruments.find(
      (item) => item.id === activeObservation.instrumentId,
    )
    if (!instrument) {
      return ['The active observation references an unavailable instrument.']
    }

    const executionTimeMinute = approximatelyEqual(
      timeMinute,
      activeObservation.plannedEndMinute,
    )
      ? activeObservation.plannedEndMinute
      : timeMinute
    const elapsedMinutes = Math.min(
      activeObservation.plannedEndMinute -
        activeObservation.startedAtMinute,
      Math.max(0, executionTimeMinute - activeObservation.startedAtMinute),
    )
    let energyConsumedWh = calculateEnergyConsumption(
      instrument.powerConsumption,
      elapsedMinutes,
    )
    const appliedIds = new Set(
      nextState.missionEventState.appliedEventIds,
    )
    for (const event of nextState.missionEvents) {
      if (
        appliedIds.has(event.id) &&
        (event.triggerTimeMinute <= executionTimeMinute ||
          approximatelyEqual(
            event.triggerTimeMinute,
            executionTimeMinute,
          )) &&
        event.effect.type === 'INSTRUMENT_POWER_INCREASE' &&
        event.effect.instrumentId === activeObservation.instrumentId
      ) {
        const modifierDuration = Math.max(
          0,
          executionTimeMinute -
            Math.max(
              activeObservation.startedAtMinute,
              event.triggerTimeMinute,
            ),
        )
        energyConsumedWh += calculateEnergyConsumption(
          event.effect.increaseWatts,
          modifierDuration,
        )
      }
    }
    const dataGeneratedMB = calculateDataGenerated(
      instrument.dataRate,
      elapsedMinutes,
    )

    if (
      !isNonNegativeFinite(energyConsumedWh) ||
      !isNonNegativeFinite(dataGeneratedMB)
    ) {
      return [
        `Resource calculations for observation "${activeObservation.observationId}" exceed the supported numeric range.`,
      ]
    }

    const specifications =
      nextState.missionEventState.spacecraftSpecifications
    const energyConsumedWhAvailable = Math.max(
      0,
      specifications.batteryCapacity -
        activeObservation.energyConsumedAtStartWh,
    )
    const dataGeneratedMBAvailable = Math.max(
      0,
      specifications.storageCapacity -
        activeObservation.dataGeneratedAtStartMB,
    )
    const updatedEnergyTotal = Math.min(
      specifications.batteryCapacity,
      activeObservation.energyConsumedAtStartWh +
        Math.min(energyConsumedWhAvailable, energyConsumedWh),
    )
    const updatedDataTotal = Math.min(
      specifications.storageCapacity,
      activeObservation.dataGeneratedAtStartMB +
        Math.min(dataGeneratedMBAvailable, dataGeneratedMB),
    )

    activeObservation.elapsedMinutes = elapsedMinutes
    activeObservation.energyConsumedWh = Math.max(
      0,
      updatedEnergyTotal - activeObservation.energyConsumedAtStartWh,
    )
    activeObservation.dataGeneratedMB = Math.max(
      0,
      updatedDataTotal - activeObservation.dataGeneratedAtStartMB,
    )
    nextState.actualEnergyConsumptionWh = updatedEnergyTotal
    nextState.actualDataGeneratedMB = updatedDataTotal
    return []
  }

  const processDueEvents = (): string[] => {
    while (
      eventIndex < dueEvents.length &&
      (dueEvents[eventIndex].event.triggerTimeMinute <= currentTimeMinute ||
        approximatelyEqual(
          dueEvents[eventIndex].event.triggerTimeMinute,
          currentTimeMinute,
        ))
    ) {
      const triggerTimeMinute =
        dueEvents[eventIndex].event.triggerTimeMinute
      let groupEnd = eventIndex + 1
      while (
        groupEnd < dueEvents.length &&
        approximatelyEqual(
          dueEvents[groupEnd].event.triggerTimeMinute,
          triggerTimeMinute,
        ) &&
        (dueEvents[groupEnd].event.triggerTimeMinute <= currentTimeMinute ||
          approximatelyEqual(
            dueEvents[groupEnd].event.triggerTimeMinute,
            currentTimeMinute,
          ))
      ) {
        groupEnd += 1
      }

      const eventProcessingTime = approximatelyEqual(
        triggerTimeMinute,
        currentTimeMinute,
      )
        ? currentTimeMinute
        : triggerTimeMinute
      const eventGroup = dueEvents
        .slice(eventIndex, groupEnd)
        .sort((left, right) => left.index - right.index)
      const eventsToApply = eventGroup
        .map(({ event }) => {
          const normalizedEvent = cloneMissionEvent(event)
          normalizedEvent.triggerTimeMinute = eventProcessingTime
          return normalizedEvent
        })
      const eventResult = applyMissionEvents(
        eventsToApply,
        eventProcessingTime,
        nextState.missionEventState,
      )
      if (eventResult.errors.length > 0) {
        return eventResult.errors
      }

      nextState.missionEventState = eventResult.state
      appliedEvents.push(
        ...eventResult.appliedEvents.map((appliedEvent) => {
          const originalEvent = nextState.missionEvents.find(
            (event) => event.id === appliedEvent.id,
          )
          return originalEvent
            ? cloneMissionEvent(originalEvent)
            : appliedEvent
        }),
      )
      messages.push(...eventResult.messages)

      for (const rejection of eventResult.rejectedEvents) {
        if (rejectedEventIds.has(rejection.eventId)) {
          continue
        }
        rejectedEventIds.add(rejection.eventId)
        const recordedRejection = { ...rejection }
        nextState.rejectedMissionEvents.push(recordedRejection)
        rejectedEvents.push(recordedRejection)
      }

      eventIndex = groupEnd
    }

    return []
  }

  while (true) {
    const eventErrors = processDueEvents()
    if (eventErrors.length > 0) {
      return createInvalidAdvanceResult(eventErrors)
    }

    if (nextState.activeObservation) {
      const resourceErrors = updateActiveResources(currentTimeMinute)
      if (resourceErrors.length > 0) {
        return createInvalidAdvanceResult(resourceErrors)
      }

      const activeObservation = nextState.activeObservation
      const unavailable = isInstrumentUnavailable(
        activeObservation.instrumentId,
        currentTimeMinute,
      )
      if (unavailable) {
        recordInterruption(
          activeObservation.observationId,
          currentTimeMinute,
          activeObservation.energyConsumedWh,
          activeObservation.dataGeneratedMB,
          `Instrument "${activeObservation.instrumentId}" failed during the observation.`,
        )
        continue
      }

      if (
        currentTimeMinute >= activeObservation.plannedEndMinute ||
        approximatelyEqual(
          currentTimeMinute,
          activeObservation.plannedEndMinute,
        )
      ) {
        nextState.completedObservationIds.push(
          activeObservation.observationId,
        )
        nextState.activeObservation = null
        continue
      }

      const instrument = instruments.find(
        (item) => item.id === activeObservation.instrumentId,
      )
      if (!instrument) {
        return createInvalidAdvanceResult([
          'The active observation references an unavailable instrument.',
        ])
      }
      const instrumentPowerWatts =
        instrument.powerConsumption +
        (nextState.missionEventState.instrumentPowerIncreasesWatts[
          activeObservation.instrumentId
        ] ?? 0)
      const specifications =
        nextState.missionEventState.spacecraftSpecifications
      const batteryBoundaryMinute =
        instrumentPowerWatts > 0
          ? currentTimeMinute +
            (Math.max(
              0,
              specifications.batteryCapacity -
                nextState.actualEnergyConsumptionWh,
            ) *
              60) /
              instrumentPowerWatts
          : Number.POSITIVE_INFINITY
      const storageBoundaryMinute =
        instrument.dataRate > 0
          ? currentTimeMinute +
            Math.max(
              0,
              specifications.storageCapacity -
                nextState.actualDataGeneratedMB,
            ) /
              instrument.dataRate
          : Number.POSITIVE_INFINITY
      if (approximatelyEqual(currentTimeMinute, batteryBoundaryMinute)) {
        nextState.actualEnergyConsumptionWh =
          specifications.batteryCapacity
        activeObservation.energyConsumedWh = Math.max(
          0,
          specifications.batteryCapacity -
            activeObservation.energyConsumedAtStartWh,
        )
      }
      if (approximatelyEqual(currentTimeMinute, storageBoundaryMinute)) {
        nextState.actualDataGeneratedMB = specifications.storageCapacity
        activeObservation.dataGeneratedMB = Math.max(
          0,
          specifications.storageCapacity -
            activeObservation.dataGeneratedAtStartMB,
        )
      }
      const batteryExhausted =
        instrumentPowerWatts > 0 &&
        nextState.actualEnergyConsumptionWh >= specifications.batteryCapacity
      const storageExhausted =
        instrument.dataRate > 0 &&
        nextState.actualDataGeneratedMB >= specifications.storageCapacity
      if (batteryExhausted || storageExhausted) {
        const exhaustedResources = [
          ...(batteryExhausted ? ['battery capacity'] : []),
          ...(storageExhausted ? ['storage capacity'] : []),
        ]
        recordInterruption(
          activeObservation.observationId,
          currentTimeMinute,
          activeObservation.energyConsumedWh,
          activeObservation.dataGeneratedMB,
          `${exhaustedResources.join(' and ')} was exhausted during the observation.`,
        )
        continue
      }
    }

    if (
      !nextState.activeObservation &&
      nextState.nextScheduledObservationIndex <
        nextState.schedule.scheduledObservations.length &&
      (nextState.schedule.scheduledObservations[
        nextState.nextScheduledObservationIndex
      ].startMinute <= currentTimeMinute ||
        approximatelyEqual(
          nextState.schedule.scheduledObservations[
            nextState.nextScheduledObservationIndex
          ].startMinute,
          currentTimeMinute,
        ))
    ) {
      const scheduledObservation =
        nextState.schedule.scheduledObservations[
          nextState.nextScheduledObservationIndex
        ]
      const opportunity =
        nextState.missionEventState.observationCatalogue.find(
          (item) => item.id === scheduledObservation.observationId,
        )
      const instrument = opportunity
        ? instruments.find((item) => item.id === opportunity.instrumentId)
        : undefined
      if (!opportunity || !instrument) {
        return createInvalidAdvanceResult([
          `Scheduled observation "${scheduledObservation.observationId}" cannot be resolved.`,
        ])
      }

      nextState.nextScheduledObservationIndex += 1
      if (
        currentTimeMinute > scheduledObservation.startMinute &&
        !approximatelyEqual(
          currentTimeMinute,
          scheduledObservation.startMinute,
        )
      ) {
        recordInterruption(
          scheduledObservation.observationId,
          currentTimeMinute,
          0,
          0,
          'The scheduled observation start time was missed.',
        )
        continue
      }

      if (
        isInstrumentUnavailable(instrument.id, currentTimeMinute)
      ) {
        recordInterruption(
          scheduledObservation.observationId,
          currentTimeMinute,
          0,
          0,
          `Instrument "${instrument.id}" was unavailable when the observation was scheduled to start.`,
        )
        continue
      }

      const instrumentPowerWatts =
        instrument.powerConsumption +
        (nextState.missionEventState.instrumentPowerIncreasesWatts[
          instrument.id
        ] ?? 0)
      const specifications =
        nextState.missionEventState.spacecraftSpecifications
      const batteryUnavailable =
        opportunity.durationMinutes > 0 &&
        instrumentPowerWatts > 0 &&
        nextState.actualEnergyConsumptionWh >= specifications.batteryCapacity
      const storageUnavailable =
        opportunity.durationMinutes > 0 &&
        instrument.dataRate > 0 &&
        nextState.actualDataGeneratedMB >= specifications.storageCapacity
      if (batteryUnavailable || storageUnavailable) {
        const unavailableResources = [
          ...(batteryUnavailable ? ['battery capacity'] : []),
          ...(storageUnavailable ? ['storage capacity'] : []),
        ]
        recordInterruption(
          scheduledObservation.observationId,
          currentTimeMinute,
          0,
          0,
          `${unavailableResources.join(' and ')} was exhausted before the observation started.`,
        )
        continue
      }

      const startedAtMinute = currentTimeMinute
      nextState.activeObservation = {
        observationId: scheduledObservation.observationId,
        instrumentId: opportunity.instrumentId,
        startedAtMinute,
        plannedEndMinute: scheduledObservation.endMinute,
        elapsedMinutes: 0,
        energyConsumedWh: 0,
        dataGeneratedMB: 0,
        energyConsumedAtStartWh: nextState.actualEnergyConsumptionWh,
        dataGeneratedAtStartMB: nextState.actualDataGeneratedMB,
      }
      continue
    }

    if (currentTimeMinute >= effectiveTargetMinute) {
      break
    }

    let nextBoundaryMinute = effectiveTargetMinute
    let batteryBoundaryMinute = Number.POSITIVE_INFINITY
    let storageBoundaryMinute = Number.POSITIVE_INFINITY
    const considerBoundary = (candidateMinute: number): void => {
      if (
        Number.isFinite(candidateMinute) &&
        candidateMinute > currentTimeMinute &&
        !approximatelyEqual(candidateMinute, currentTimeMinute) &&
        candidateMinute < nextBoundaryMinute
      ) {
        nextBoundaryMinute = candidateMinute
      }
    }

    if (eventIndex < dueEvents.length) {
      considerBoundary(dueEvents[eventIndex].event.triggerTimeMinute)
    }

    if (nextState.activeObservation) {
      const activeObservation = nextState.activeObservation
      considerBoundary(activeObservation.plannedEndMinute)
      const instrument = instruments.find(
        (item) => item.id === activeObservation.instrumentId,
      )
      if (!instrument) {
        return createInvalidAdvanceResult([
          'The active observation references an unavailable instrument.',
        ])
      }
      const instrumentPowerWatts =
        instrument.powerConsumption +
        (nextState.missionEventState.instrumentPowerIncreasesWatts[
          activeObservation.instrumentId
        ] ?? 0)
      const specifications =
        nextState.missionEventState.spacecraftSpecifications
      const batteryRemainingWh = Math.max(
        0,
        specifications.batteryCapacity -
          nextState.actualEnergyConsumptionWh,
      )
      const storageRemainingMB = Math.max(
        0,
        specifications.storageCapacity -
          nextState.actualDataGeneratedMB,
      )
      batteryBoundaryMinute =
        instrumentPowerWatts > 0
          ? currentTimeMinute +
            (batteryRemainingWh * 60) / instrumentPowerWatts
          : Number.POSITIVE_INFINITY
      storageBoundaryMinute =
        instrument.dataRate > 0
          ? currentTimeMinute + storageRemainingMB / instrument.dataRate
          : Number.POSITIVE_INFINITY
      considerBoundary(batteryBoundaryMinute)
      considerBoundary(storageBoundaryMinute)
    } else if (
      nextState.nextScheduledObservationIndex <
      nextState.schedule.scheduledObservations.length
    ) {
      considerBoundary(
        nextState.schedule.scheduledObservations[
          nextState.nextScheduledObservationIndex
        ].startMinute,
      )
    }

    for (const failure of nextState.missionEventState.instrumentFailurePeriods) {
      considerBoundary(failure.unavailableFromMinute)
      considerBoundary(failure.unavailableUntilMinute)
    }

    if (nextBoundaryMinute <= currentTimeMinute) {
      break
    }

    if (nextState.activeObservation) {
      const activeObservation = nextState.activeObservation
      const resourceErrors = updateActiveResources(nextBoundaryMinute)
      if (resourceErrors.length > 0) {
        return createInvalidAdvanceResult(resourceErrors)
      }
      const specifications =
        nextState.missionEventState.spacecraftSpecifications
      if (
        approximatelyEqual(
          nextBoundaryMinute,
          batteryBoundaryMinute,
        )
      ) {
        nextState.actualEnergyConsumptionWh =
          specifications.batteryCapacity
        activeObservation.energyConsumedWh = Math.max(
          0,
          specifications.batteryCapacity -
            activeObservation.energyConsumedAtStartWh,
        )
      }
      if (
        approximatelyEqual(
          nextBoundaryMinute,
          storageBoundaryMinute,
        )
      ) {
        nextState.actualDataGeneratedMB = specifications.storageCapacity
        activeObservation.dataGeneratedMB = Math.max(
          0,
          specifications.storageCapacity -
            activeObservation.dataGeneratedAtStartMB,
        )
      }
    }

    currentTimeMinute = nextBoundaryMinute
  }

  nextState.currentTimeMinute = currentTimeMinute
  nextState.status =
    reachedMissionWindow
      ? 'completed'
      : currentTimeMinute > 0 ||
          nextState.activeObservation !== null ||
          nextState.nextScheduledObservationIndex > 0
        ? 'running'
        : status

  return {
    valid: true,
    state: nextState,
    appliedEvents,
    rejectedEvents,
    messages,
    errors: [],
  }
}
