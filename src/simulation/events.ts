import {
  communicationSystems,
  instruments,
  powerSystems,
  storageSystems,
} from '../data/spacecraftOptions'
import type {
  SpacecraftConfiguration,
  SpacecraftSpecifications,
} from '../types/mission'
import type { ObservationOpportunity } from './scheduler'

export type MissionEventCategory = 'RESOURCE' | 'EQUIPMENT' | 'OPPORTUNITY'

export type MissionEventEffect =
  | {
      type: 'SOLAR_GENERATION_REDUCTION'
      reductionWatts: number
    }
  | {
      type: 'INSTRUMENT_POWER_INCREASE'
      instrumentId: string
      increaseWatts: number
    }
  | {
      type: 'INSTRUMENT_FAILURE'
      instrumentId: string
      durationMinutes: number
    }
  | {
      type: 'NEW_OBSERVATION'
      observation: ObservationOpportunity
    }

export interface MissionEvent {
  id: string
  title: string
  description: string
  category: MissionEventCategory
  triggerTimeMinute: number
  effect: MissionEventEffect
}

export interface InstrumentFailurePeriod {
  instrumentId: string
  unavailableFromMinute: number
  unavailableUntilMinute: number
}

export interface MissionEventState {
  spacecraftConfiguration: SpacecraftConfiguration
  spacecraftSpecifications: SpacecraftSpecifications
  observationCatalogue: ObservationOpportunity[]
  instrumentPowerIncreasesWatts: Record<string, number>
  instrumentFailurePeriods: InstrumentFailurePeriod[]
  appliedEventIds: string[]
}

export interface RejectedMissionEvent {
  eventId: string
  reason: string
}

export interface MissionEventResult {
  state: MissionEventState
  appliedEvents: MissionEvent[]
  pendingEvents: MissionEvent[]
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
      (instrumentId: unknown) =>
        typeof instrumentId === 'string' &&
        instruments.some((instrument) => instrument.id === instrumentId),
    )
  ) {
    return false
  }

  return (
    powerSystems.some((system) => system.id === value.powerSystemId) &&
    communicationSystems.some(
      (system) => system.id === value.communicationSystemId,
    ) &&
    storageSystems.some((system) => system.id === value.storageSystemId) &&
    new Set(value.instrumentIds).size === value.instrumentIds.length
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

function isInstrumentFailurePeriod(
  value: unknown,
): value is InstrumentFailurePeriod {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.instrumentId === 'string' &&
    isNonNegativeFinite(value.unavailableFromMinute) &&
    isPositiveFinite(value.unavailableUntilMinute) &&
    value.unavailableUntilMinute > value.unavailableFromMinute
  )
}

function isMissionEventState(value: unknown): value is MissionEventState {
  if (!isRecord(value)) {
    return false
  }

  const {
    spacecraftConfiguration,
    spacecraftSpecifications,
    observationCatalogue,
    instrumentPowerIncreasesWatts,
    instrumentFailurePeriods,
    appliedEventIds,
  } = value

  if (
    !isSpacecraftConfiguration(spacecraftConfiguration) ||
    !isSpacecraftSpecifications(spacecraftSpecifications) ||
    !Array.isArray(observationCatalogue) ||
    !observationCatalogue.every(isObservationOpportunity) ||
    !isRecord(instrumentPowerIncreasesWatts) ||
    !Array.isArray(instrumentFailurePeriods) ||
    !instrumentFailurePeriods.every(isInstrumentFailurePeriod) ||
    !Array.isArray(appliedEventIds) ||
    !appliedEventIds.every(
      (eventId: unknown) =>
        typeof eventId === 'string' && eventId.trim().length > 0,
    )
  ) {
    return false
  }

  const installedInstrumentIds = new Set(
    spacecraftConfiguration.instrumentIds,
  )
  const observationIds = observationCatalogue.map(
    (observation) => observation.id,
  )

  return (
    new Set(observationIds).size === observationIds.length &&
    new Set(appliedEventIds).size === appliedEventIds.length &&
    Object.entries(instrumentPowerIncreasesWatts).every(
      ([instrumentId, increase]) =>
        installedInstrumentIds.has(instrumentId) &&
        isNonNegativeFinite(increase),
    ) &&
    instrumentFailurePeriods.every((failure) =>
      installedInstrumentIds.has(failure.instrumentId),
    )
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

  switch (value.effect.type) {
    case 'SOLAR_GENERATION_REDUCTION':
      return (
        value.category === 'RESOURCE' &&
        isPositiveFinite(value.effect.reductionWatts)
      )
    case 'INSTRUMENT_POWER_INCREASE':
      return (
        value.category === 'RESOURCE' &&
        typeof value.effect.instrumentId === 'string' &&
        value.effect.instrumentId.trim().length > 0 &&
        isPositiveFinite(value.effect.increaseWatts)
      )
    case 'INSTRUMENT_FAILURE':
      return (
        value.category === 'EQUIPMENT' &&
        typeof value.effect.instrumentId === 'string' &&
        value.effect.instrumentId.trim().length > 0 &&
        isPositiveFinite(value.effect.durationMinutes)
      )
    case 'NEW_OBSERVATION':
      return (
        value.category === 'OPPORTUNITY' &&
        isObservationOpportunity(value.effect.observation)
      )
    default:
      return false
  }
}

function cloneMissionEvent(event: MissionEvent): MissionEvent {
  const effect = event.effect
  switch (effect.type) {
    case 'NEW_OBSERVATION':
      return {
        ...event,
        effect: { ...effect, observation: { ...effect.observation } },
      }
    default:
      return { ...event, effect: { ...effect } }
  }
}

function cloneMissionEventState(state: MissionEventState): MissionEventState {
  return {
    spacecraftConfiguration: {
      ...state.spacecraftConfiguration,
      instrumentIds: [...state.spacecraftConfiguration.instrumentIds],
    },
    spacecraftSpecifications: { ...state.spacecraftSpecifications },
    observationCatalogue: state.observationCatalogue.map(
      (observation) => ({ ...observation }),
    ),
    instrumentPowerIncreasesWatts: {
      ...state.instrumentPowerIncreasesWatts,
    },
    instrumentFailurePeriods: state.instrumentFailurePeriods.map(
      (failure) => ({ ...failure }),
    ),
    appliedEventIds: [...state.appliedEventIds],
  }
}

function createResult(
  state: MissionEventState,
  errors: string[] = [],
): MissionEventResult {
  return {
    state,
    appliedEvents: [],
    pendingEvents: [],
    rejectedEvents: [],
    messages: [],
    errors,
  }
}

/**
 * Applies valid events whose trigger time has been reached, in input order.
 */
export function applyMissionEvents(
  events: MissionEvent[],
  currentTimeMinute: number,
  state: MissionEventState,
): MissionEventResult {
  if (!isMissionEventState(state)) {
    return createResult(state, ['Mission event state is invalid.'])
  }

  const updatedState = cloneMissionEventState(state)
  if (!Array.isArray(events)) {
    return createResult(updatedState, [
      'Mission events must be provided as a list.',
    ])
  }

  if (!isNonNegativeFinite(currentTimeMinute)) {
    return createResult(updatedState, [
      'Current mission time must be a non-negative finite number of minutes.',
    ])
  }

  const result = createResult(updatedState)
  const eventIdCounts = new Map<string, number>()
  for (const candidate of events) {
    if (
      isRecord(candidate) &&
      typeof candidate.id === 'string' &&
      candidate.id.trim().length > 0
    ) {
      eventIdCounts.set(
        candidate.id,
        (eventIdCounts.get(candidate.id) ?? 0) + 1,
      )
    }
  }

  for (const candidate of events) {
    const candidateId =
      isRecord(candidate) && typeof candidate.id === 'string'
        ? candidate.id
        : '[invalid event ID]'

    if (!isMissionEvent(candidate)) {
      result.rejectedEvents.push({
        eventId: candidateId,
        reason: 'Event details or effect parameters are invalid.',
      })
      continue
    }

    if ((eventIdCounts.get(candidate.id) ?? 0) > 1) {
      result.rejectedEvents.push({
        eventId: candidate.id,
        reason: 'Event IDs must be unique; this ID appears more than once.',
      })
      continue
    }

    if (updatedState.appliedEventIds.includes(candidate.id)) {
      result.rejectedEvents.push({
        eventId: candidate.id,
        reason: 'This event has already been applied and will not be repeated.',
      })
      continue
    }

    if (candidate.triggerTimeMinute > currentTimeMinute) {
      result.pendingEvents.push(cloneMissionEvent(candidate))
      continue
    }

    const effect = candidate.effect
    let consequence: string

    switch (effect.type) {
      case 'SOLAR_GENERATION_REDUCTION': {
        const solarGeneration = updatedState.spacecraftSpecifications.solarGeneration
        if (effect.reductionWatts > solarGeneration) {
          result.rejectedEvents.push({
            eventId: candidate.id,
            reason: `The ${effect.reductionWatts} W reduction exceeds the remaining ${solarGeneration} W solar generation.`,
          })
          continue
        }

        const updatedSolarGeneration =
          solarGeneration - effect.reductionWatts
        if (!isNonNegativeFinite(updatedSolarGeneration)) {
          result.rejectedEvents.push({
            eventId: candidate.id,
            reason: 'The event would produce an invalid solar generation value.',
          })
          continue
        }

        updatedState.spacecraftSpecifications = {
          ...updatedState.spacecraftSpecifications,
          solarGeneration: updatedSolarGeneration,
        }
        consequence = `Solar generation is reduced by ${effect.reductionWatts} W to ${updatedSolarGeneration} W.`
        break
      }
      case 'INSTRUMENT_POWER_INCREASE': {
        const instrument = instruments.find(
          (item) => item.id === effect.instrumentId,
        )
        if (
          !instrument ||
          !updatedState.spacecraftConfiguration.instrumentIds.includes(
            effect.instrumentId,
          )
        ) {
          result.rejectedEvents.push({
            eventId: candidate.id,
            reason: `Instrument "${effect.instrumentId}" is not installed on this spacecraft.`,
          })
          continue
        }

        const currentIncrease =
          updatedState.instrumentPowerIncreasesWatts[effect.instrumentId] ?? 0
        const updatedIncrease = currentIncrease + effect.increaseWatts
        const updatedTotalInstrumentPower =
          updatedState.spacecraftSpecifications.totalInstrumentPower +
          effect.increaseWatts
        const updatedInstrumentPower =
          instrument.powerConsumption + updatedIncrease
        if (
          !isNonNegativeFinite(updatedIncrease) ||
          !isNonNegativeFinite(updatedTotalInstrumentPower) ||
          !isNonNegativeFinite(updatedInstrumentPower)
        ) {
          result.rejectedEvents.push({
            eventId: candidate.id,
            reason: 'The event would produce an invalid instrument power value.',
          })
          continue
        }

        updatedState.instrumentPowerIncreasesWatts = {
          ...updatedState.instrumentPowerIncreasesWatts,
          [effect.instrumentId]: updatedIncrease,
        }
        updatedState.spacecraftSpecifications = {
          ...updatedState.spacecraftSpecifications,
          totalInstrumentPower: updatedTotalInstrumentPower,
        }
        consequence = `${instrument.name} now draws ${updatedIncrease} W more when operating (${updatedInstrumentPower} W total).`
        break
      }
      case 'INSTRUMENT_FAILURE': {
        const instrument = instruments.find(
          (item) => item.id === effect.instrumentId,
        )
        const unavailableUntilMinute =
          candidate.triggerTimeMinute + effect.durationMinutes
        if (
          !instrument ||
          !updatedState.spacecraftConfiguration.instrumentIds.includes(
            effect.instrumentId,
          )
        ) {
          result.rejectedEvents.push({
            eventId: candidate.id,
            reason: `Instrument "${effect.instrumentId}" is not installed on this spacecraft.`,
          })
          continue
        }
        if (!isPositiveFinite(unavailableUntilMinute)) {
          result.rejectedEvents.push({
            eventId: candidate.id,
            reason: 'The instrument failure duration exceeds the supported time range.',
          })
          continue
        }

        updatedState.instrumentFailurePeriods = [
          ...updatedState.instrumentFailurePeriods,
          {
            instrumentId: effect.instrumentId,
            unavailableFromMinute: candidate.triggerTimeMinute,
            unavailableUntilMinute,
          },
        ]
        consequence =
          currentTimeMinute >= unavailableUntilMinute
            ? `${instrument.name} was unavailable from minute ${candidate.triggerTimeMinute} to minute ${unavailableUntilMinute}; the failure period has ended.`
            : `${instrument.name} is unavailable until minute ${unavailableUntilMinute}.`
        break
      }
      case 'NEW_OBSERVATION': {
        if (
          updatedState.observationCatalogue.some(
            (observation) => observation.id === effect.observation.id,
          )
        ) {
          result.rejectedEvents.push({
            eventId: candidate.id,
            reason: `Observation "${effect.observation.id}" is already in the catalogue.`,
          })
          continue
        }
        if (
          !updatedState.spacecraftConfiguration.instrumentIds.includes(
            effect.observation.instrumentId,
          )
        ) {
          result.rejectedEvents.push({
            eventId: candidate.id,
            reason: `Observation "${effect.observation.name}" requires instrument "${effect.observation.instrumentId}", which is not installed.`,
          })
          continue
        }

        updatedState.observationCatalogue = [
          ...updatedState.observationCatalogue,
          { ...effect.observation },
        ]
        consequence = `A new observation, "${effect.observation.name}", is available: ${effect.observation.description}`
        break
      }
    }

    updatedState.appliedEventIds = [
      ...updatedState.appliedEventIds,
      candidate.id,
    ]
    const appliedEvent = cloneMissionEvent(candidate)
    result.appliedEvents.push(appliedEvent)
    result.messages.push(
      `${candidate.title}: ${candidate.description} ${consequence}`,
    )
  }

  return result
}