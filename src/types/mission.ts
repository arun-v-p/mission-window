
export interface PowerSystem {
  id: string
  name: string
  batteryCapacity: number
  solarGeneration: number
  mass: number
  cost: number
}

export interface ScientificInstrument {
  id: string
  name: string
  description: string
  powerConsumption: number
  dataRate: number
  mass: number
  cost: number
  scienceValue: number
}

export interface CommunicationSystem {
  id: string
  name: string
  dataRate: number
  mass: number
  cost: number
}

export interface StorageSystem {
  id: string
  name: string
  capacity: number
  mass: number
  cost: number
}

export interface SpacecraftConfiguration {
  powerSystemId: string
  instrumentIds: string[]
  communicationSystemId: string
  storageSystemId: string
}

export interface SpacecraftSpecifications {
  totalMass: number
  totalCost: number
  batteryCapacity: number
  solarGeneration: number
  totalInstrumentPower: number
  communicationRate: number
  storageCapacity: number
  totalScienceValue: number
}
