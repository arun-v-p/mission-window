import type { SpacecraftConfiguration } from '../types/mission'

export interface NasaMissionPreset {
  id: string
  name: string
  callsign: string
  agency: string
  tagline: string
  description: string
  configuration: SpacecraftConfiguration
  recommendedObservations: string[]
  badgeColor: string
}

export const nasaPresets: NasaMissionPreset[] = [
  {
    id: 'landsat-9',
    name: 'Landsat 9',
    callsign: 'L9-ORBITAL',
    agency: 'NASA / USGS',
    tagline: 'Multispectral Land & Coastal Survey',
    description:
      'Continuous global multispectral surface survey mapping changing coastlines, vegetation vigor, and delta topography.',
    configuration: {
      powerSystemId: 'power-standard',
      instrumentIds: ['camera', 'radar'],
      communicationSystemId: 'antenna-standard',
      storageSystemId: 'storage-standard',
    },
    recommendedObservations: [
      'obs-camera-coastal-cloud-gap',
      'obs-radar-delta-floodplain',
      'obs-camera-night-lights',
    ],
    badgeColor: '#2997ff',
  },
  {
    id: 'sentinel-6',
    name: 'Sentinel-6 MF',
    callsign: 'S6-RADAR-SYS',
    agency: 'NASA / ESA / NOAA',
    tagline: 'High-Power Synthetic Radar Altimetry',
    description:
      'High-energy radar pulses penetrating cloud decks to track flood plains and marine boundaries with millimeter precision.',
    configuration: {
      powerSystemId: 'power-advanced',
      instrumentIds: ['radar'],
      communicationSystemId: 'antenna-advanced',
      storageSystemId: 'storage-standard',
    },
    recommendedObservations: [
      'obs-radar-delta-floodplain',
      'obs-radar-front-boundary',
    ],
    badgeColor: '#30b0c7',
  },
  {
    id: 'pace-climate',
    name: 'PACE Ocean & Climate',
    callsign: 'PACE-HYPER',
    agency: 'NASA Goddard',
    tagline: 'Atmospheric Spectrometry & Aerosols',
    description:
      'Advanced hyperspectral scan measuring trace gases, ocean color dynamics, and aerosol atmospheric baseline layers.',
    configuration: {
      powerSystemId: 'power-standard',
      instrumentIds: ['camera', 'spectrometer'],
      communicationSystemId: 'antenna-standard',
      storageSystemId: 'storage-advanced',
    },
    recommendedObservations: [
      'obs-camera-coastal-cloud-gap',
      'obs-spectrometer-upper-air',
      'obs-spectrometer-trace-gases',
    ],
    badgeColor: '#af52de',
  },
]
