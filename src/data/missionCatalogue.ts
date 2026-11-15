import type { MissionEvent, MissionEventEffect } from '../simulation/events'
import type { ObservationOpportunity } from '../simulation/scheduler'
import type { MissionObjectiveDefinition } from '../simulation/objectives'

export const observationCatalogue: ObservationOpportunity[] = [
  {
    id: 'obs-camera-coastal-cloud-gap',
    name: 'Coastal Cloud-Gap Survey',
    description:
      'Use a brief clear-sky opening to capture a focused coastal surface survey.',
    instrumentId: 'camera',
    durationMinutes: 3,
    opportunityOpensAtMinute: 0,
    opportunityClosesAtMinute: 6,
    scienceValue: 60,
  },
  {
    id: 'obs-radar-delta-floodplain',
    name: 'Delta Floodplain Sweep',
    description:
      'Map a changing delta surface during a narrow radar observation window.',
    instrumentId: 'radar',
    durationMinutes: 4,
    opportunityOpensAtMinute: 0,
    opportunityClosesAtMinute: 6,
    scienceValue: 90,
  },
  {
    id: 'obs-spectrometer-upper-air',
    name: 'Upper-Air Baseline',
    description:
      'Collect a short atmospheric-composition baseline before the window closes.',
    instrumentId: 'spectrometer',
    durationMinutes: 3,
    opportunityOpensAtMinute: 0,
    opportunityClosesAtMinute: 6,
    scienceValue: 70,
  },
  {
    id: 'obs-camera-night-lights',
    name: 'Night-Light Transition',
    description:
      'Capture a later multispectral pass over a region entering darkness.',
    instrumentId: 'camera',
    durationMinutes: 3,
    opportunityOpensAtMinute: 6,
    opportunityClosesAtMinute: 12,
    scienceValue: 75,
  },
  {
    id: 'obs-radar-front-boundary',
    name: 'Front-Boundary Mapping',
    description:
      'Use radar to map a simulated surface boundary during the late pass.',
    instrumentId: 'radar',
    durationMinutes: 3,
    opportunityOpensAtMinute: 7,
    opportunityClosesAtMinute: 12,
    scienceValue: 82,
  },
  {
    id: 'obs-spectrometer-trace-gases',
    name: 'Trace-Gas Window',
    description:
      'Collect a longer atmospheric-composition sample during the final window.',
    instrumentId: 'spectrometer',
    durationMinutes: 4,
    opportunityOpensAtMinute: 6,
    opportunityClosesAtMinute: 12,
    scienceValue: 95,
  },
]

const firstSolarDerating: MissionEventEffect = {
  type: 'SOLAR_GENERATION_REDUCTION',
  reductionWatts: 6,
}

const secondSolarDerating: MissionEventEffect = {
  type: 'SOLAR_GENERATION_REDUCTION',
  reductionWatts: 6,
}

export const missionEvents: MissionEvent[] = [
  {
    id: 'event-array-shadowing',
    title: 'Array Shadowing',
    description:
      'A simulated shadow persists across the arrays, reducing available solar generation for the remainder of the window.',
    category: 'RESOURCE',
    triggerTimeMinute: 4,
    effect: firstSolarDerating,
  },
  {
    id: 'event-panel-derating',
    title: 'Panel Derating',
    description:
      'A simulated panel derating further reduces available solar generation for the remainder of the window.',
    category: 'RESOURCE',
    triggerTimeMinute: 8,
    effect: secondSolarDerating,
  },
]

export const missionObjectives: MissionObjectiveDefinition[] = [
  {
    id: 'objective-two-observations',
    description: 'Complete at least two scheduled observations.',
    type: 'completed-observation-count',
    minimum: 2,
  },
  {
    id: 'objective-high-science-observation',
    description:
      'Complete a scheduled observation with a science value of at least 70.',
    type: 'completed-observation-science-value',
    minimum: 70,
  },
]
