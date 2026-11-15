import type {
  PowerSystem,
  ScientificInstrument,
  CommunicationSystem,
  StorageSystem,
} from '../types/mission'

export const powerSystems: PowerSystem[] = [
  {
    id: 'power-basic',
    name: 'Basic Solar System',
    batteryCapacity: 100,
    solarGeneration: 60,
    mass: 4,
    cost: 100,
  },
  {
    id: 'power-standard',
    name: 'Standard Solar System',
    batteryCapacity: 180,
    solarGeneration: 100,
    mass: 7,
    cost: 180,
  },
  {
    id: 'power-advanced',
    name: 'Advanced Solar System',
    batteryCapacity: 300,
    solarGeneration: 160,
    mass: 12,
    cost: 300,
  },
]

export const instruments: ScientificInstrument[] = [
  {
    id: 'camera',
    name: 'Multispectral Camera',
    description: 'Captures images for land and vegetation analysis.',
    powerConsumption: 35,
    dataRate: 50,
    mass: 3,
    cost: 150,
    scienceValue: 80,
  },
  {
    id: 'radar',
    name: 'Synthetic Aperture Radar',
    description: 'Observes surface features and flood conditions.',
    powerConsumption: 60,
    dataRate: 80,
    mass: 5,
    cost: 250,
    scienceValue: 95,
  },
  {
    id: 'spectrometer',
    name: 'Atmospheric Spectrometer',
    description: 'Studies atmospheric composition.',
    powerConsumption: 25,
    dataRate: 30,
    mass: 2,
    cost: 120,
    scienceValue: 75,
  },
]

export const communicationSystems: CommunicationSystem[] = [
  {
    id: 'antenna-basic',
    name: 'Basic Antenna',
    dataRate: 2,
    mass: 1,
    cost: 50,
  },
  {
    id: 'antenna-standard',
    name: 'Standard Antenna',
    dataRate: 10,
    mass: 2,
    cost: 120,
  },
  {
    id: 'antenna-advanced',
    name: 'High-Gain Antenna',
    dataRate: 25,
    mass: 4,
    cost: 220,
  },
]

export const storageSystems: StorageSystem[] = [
  {
    id: 'storage-basic',
    name: 'Basic Storage',
    capacity: 500,
    mass: 1,
    cost: 40,
  },
  {
    id: 'storage-standard',
    name: 'Standard Storage',
    capacity: 1000,
    mass: 2,
    cost: 90,
  },
  {
    id: 'storage-advanced',
    name: 'Advanced Storage',
    capacity: 2000,
    mass: 4,
    cost: 160,
  },
]
