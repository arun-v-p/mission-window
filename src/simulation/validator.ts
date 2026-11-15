import type {
  SpacecraftConfiguration,
  SpacecraftSpecifications,
} from '../types/mission'
import { calculateSpacecraftSpecifications } from './calculations'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface MissionResourcePlan {
  plannedEnergyConsumptionWh: number
  plannedDataGenerationMB: number
  plannedCommunicationTransferMB: number
  communicationWindowMinutes: number
}

const MAX_SPACECRAFT_MASS_KG = 25
const MAX_BUDGET_CREDITS = 1000

function createValidationResult(errors: string[] = []): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  }
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

/**
 * Validates spacecraft configuration limits for the selected components.
 */
export function validateSpacecraftConfiguration(
  configuration: SpacecraftConfiguration,
): ValidationResult {
  let specifications: SpacecraftSpecifications

  try {
    specifications = calculateSpacecraftSpecifications(configuration)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Invalid spacecraft configuration.'
    ) {
      return createValidationResult([
        'Select valid power, instrument, communication, and storage options.',
      ])
    }

    throw error
  }

  const errors: string[] = []

  if (configuration.instrumentIds.length === 0) {
    errors.push('Select at least one scientific instrument for the mission.')
  }

  if (specifications.totalMass > MAX_SPACECRAFT_MASS_KG) {
    errors.push(
      `Spacecraft mass (${specifications.totalMass} kg) exceeds the ${MAX_SPACECRAFT_MASS_KG} kg limit.`,
    )
  }

  if (specifications.totalCost > MAX_BUDGET_CREDITS) {
    errors.push(
      `Spacecraft cost (${specifications.totalCost} credits) exceeds the ${MAX_BUDGET_CREDITS}-credit budget.`,
    )
  }

  if (specifications.totalInstrumentPower > specifications.solarGeneration) {
    errors.push(
      `Instrument power demand (${specifications.totalInstrumentPower} W) exceeds solar generation (${specifications.solarGeneration} W).`,
    )
  }

  return createValidationResult(errors)
}

/**
 * Validates mission energy, data storage, and communications requirements.
 */
export function validateMissionResourcePlan(
  specifications: SpacecraftSpecifications,
  plan: MissionResourcePlan,
): ValidationResult {
  if (!specifications || typeof specifications !== 'object') {
    return createValidationResult(['Spacecraft specifications are invalid.'])
  }

  if (!plan || typeof plan !== 'object') {
    return createValidationResult(['Mission resource plan is invalid.'])
  }

  const errors: string[] = []
  const plannedInputs: Array<[string, number]> = [
    ['Planned energy consumption', plan.plannedEnergyConsumptionWh],
    ['Planned data generation', plan.plannedDataGenerationMB],
    ['Planned communication transfer', plan.plannedCommunicationTransferMB],
    ['Communication window duration', plan.communicationWindowMinutes],
  ]

  for (const [name, value] of plannedInputs) {
    if (!isNonNegativeFinite(value)) {
      errors.push(`${name} must be a non-negative finite value.`)
    }
  }

  const spacecraftCapacities: Array<[string, number]> = [
    ['Battery capacity', specifications.batteryCapacity],
    ['Storage capacity', specifications.storageCapacity],
    ['Communication rate', specifications.communicationRate],
  ]

  for (const [name, value] of spacecraftCapacities) {
    if (!isNonNegativeFinite(value)) {
      errors.push(`Spacecraft ${name.toLowerCase()} is invalid.`)
    }
  }

  if (errors.length > 0) {
    return createValidationResult(errors)
  }

  const communicationCapacityMB =
    specifications.communicationRate * plan.communicationWindowMinutes

  if (!Number.isFinite(communicationCapacityMB)) {
    return createValidationResult([
      'Calculated communication capacity is not finite; check the communication rate and window duration.',
    ])
  }

  if (plan.plannedEnergyConsumptionWh > specifications.batteryCapacity) {
    errors.push(
      `Planned energy use (${plan.plannedEnergyConsumptionWh} Wh) exceeds battery capacity (${specifications.batteryCapacity} Wh).`,
    )
  }

  if (plan.plannedDataGenerationMB > specifications.storageCapacity) {
    errors.push(
      `Planned data generation (${plan.plannedDataGenerationMB} MB) exceeds storage capacity (${specifications.storageCapacity} MB).`,
    )
  }

  if (plan.plannedCommunicationTransferMB > communicationCapacityMB) {
    errors.push(
      `Planned communication transfer (${plan.plannedCommunicationTransferMB} MB) exceeds the ${communicationCapacityMB} MB available during the communication window.`,
    )
  }

  return createValidationResult(errors)
}