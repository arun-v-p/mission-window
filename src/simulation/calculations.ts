
import type {
  SpacecraftConfiguration,
  SpacecraftSpecifications,
} from '../types/mission'

import {
  powerSystems,
  instruments,
  communicationSystems,
  storageSystems,
} from '../data/spacecraftOptions'

function validateNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number.`)
  }
}

/**
 * Calculates the complete spacecraft specifications
 * from the selected spacecraft configuration.
 */
export function calculateSpacecraftSpecifications(
  configuration: SpacecraftConfiguration,
): SpacecraftSpecifications {
  if (
    !configuration ||
    typeof configuration.powerSystemId !== 'string' ||
    typeof configuration.communicationSystemId !== 'string' ||
    typeof configuration.storageSystemId !== 'string' ||
    !Array.isArray(configuration.instrumentIds) ||
    configuration.instrumentIds.some((id) => typeof id !== 'string')
  ) {
    throw new Error('Invalid spacecraft configuration.')
  }

  const powerSystem = powerSystems.find(
    (item) => item.id === configuration.powerSystemId,
  )

  const communicationSystem = communicationSystems.find(
    (item) => item.id === configuration.communicationSystemId,
  )

  const storageSystem = storageSystems.find(
    (item) => item.id === configuration.storageSystemId,
  )

  const selectedInstruments = instruments.filter((instrument) =>
    configuration.instrumentIds.includes(instrument.id),
  )

  const hasInvalidInstrument = configuration.instrumentIds.some(
    (id) => !instruments.some((instrument) => instrument.id === id),
  )

  if (
    !powerSystem ||
    !communicationSystem ||
    !storageSystem ||
    hasInvalidInstrument
  ) {
    throw new Error('Invalid spacecraft configuration.')
  }

  const totalMass =
    powerSystem.mass +
    communicationSystem.mass +
    storageSystem.mass +
    selectedInstruments.reduce((total, item) => total + item.mass, 0)

  const totalCost =
    powerSystem.cost +
    communicationSystem.cost +
    storageSystem.cost +
    selectedInstruments.reduce((total, item) => total + item.cost, 0)

  const totalInstrumentPower = selectedInstruments.reduce(
    (total, item) => total + item.powerConsumption,
    0,
  )

  const totalScienceValue = selectedInstruments.reduce(
    (total, item) => total + item.scienceValue,
    0,
  )

  return {
    totalMass,
    totalCost,
    batteryCapacity: powerSystem.batteryCapacity,
    solarGeneration: powerSystem.solarGeneration,
    totalInstrumentPower,
    communicationRate: communicationSystem.dataRate,
    storageCapacity: storageSystem.capacity,
    totalScienceValue,
  }
}

/**
 * Calculates energy consumed by an instrument.
 *
 * Energy (Wh) = Power (W) × Time (minutes) / 60
 */
export function calculateEnergyConsumption(
  powerWatts: number,
  durationMinutes: number,
): number {
  validateNonNegativeFinite(powerWatts, 'Power')
  validateNonNegativeFinite(durationMinutes, 'Duration')
  return (powerWatts * durationMinutes) / 60
}

/**
 * Calculates the amount of data generated during an observation.
 *
 * Data (MB) = Data rate (MB/min) × Duration (minutes)
 */
export function calculateDataGenerated(
  dataRateMBPerMinute: number,
  durationMinutes: number,
): number {
  validateNonNegativeFinite(dataRateMBPerMinute, 'Data rate')
  validateNonNegativeFinite(durationMinutes, 'Duration')
  return dataRateMBPerMinute * durationMinutes
}

/**
 * Calculates the remaining battery energy after an observation.
 */
export function calculateRemainingBattery(
  batteryCapacityWh: number,
  energyConsumedWh: number,
): number {
  validateNonNegativeFinite(batteryCapacityWh, 'Battery capacity')
  validateNonNegativeFinite(energyConsumedWh, 'Energy consumed')
  return batteryCapacityWh - energyConsumedWh
}

/**
 * Calculates remaining storage after collecting observation data.
 */
export function calculateRemainingStorage(
  storageCapacityMB: number,
  dataGeneratedMB: number,
): number {
  validateNonNegativeFinite(storageCapacityMB, 'Storage capacity')
  validateNonNegativeFinite(dataGeneratedMB, 'Data generated')
  return storageCapacityMB - dataGeneratedMB
}
