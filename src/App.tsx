
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Satellite, Activity, Target, Radio } from 'lucide-react'
import SpacecraftDesigner, {
  initialConfiguration,
} from './components/Spacecraft/SpacecraftDesigner'
import MissionControl, {
  getNextMissionBoundary,
  type MissionEventLogEntry,
} from './components/MissionControl/MissionControl'
import MissionPlanner from './components/MissionPlanner/MissionPlanner'
import MissionDebrief from './components/MissionDebrief/MissionDebrief'
import type { SpacecraftConfiguration } from './types/mission'
import {
  advanceMissionTo,
  initializeMissionEngine,
  type MissionEngineAdvanceResult,
  type MissionEngineState,
} from './simulation/missionEngine'
import { observationCatalogue, missionEvents, missionObjectives } from './data/missionCatalogue'
import {
  DEFAULT_MISSION_WINDOW_DURATION_MINUTES,
  scheduleObservations,
  type ScheduleResult,
} from './simulation/scheduler'
import { validateSpacecraftConfiguration } from './simulation/validator'
import type { MissionEvent } from './simulation/events'
import { calculateMissionScore } from './simulation/scoring'
import { evaluateMissionObjectives } from './simulation/objectives'

const GameCanvas = lazy(() => import('./game/GameCanvas'))

type PlaybackSpeed = 1 | 2 | 4
type NavigationItem = 'overview' | 'designer' | 'observations' | 'communications'

function App() {
  const [configuration, setConfiguration] =
    useState<SpacecraftConfiguration>(initialConfiguration)
  const [selectedObservationIds, setSelectedObservationIds] = useState<
    string[]
  >([])
  const [missionEngineState, setMissionEngineState] =
    useState<MissionEngineState | null>(null)
  const missionEngineStateRef = useRef<MissionEngineState | null>(null)
  const [missionEventHistory, setMissionEventHistory] = useState<
    MissionEventLogEntry[]
  >([])
  const [advancementErrors, setAdvancementErrors] = useState<string[]>([])
  const [isPlaybackRunning, setIsPlaybackRunning] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)
  const [autoPauseOnTransitions, setAutoPauseOnTransitions] = useState(true)
  const [playbackPauseReason, setPlaybackPauseReason] = useState<string | null>(
    null,
  )
  const [activeNavigationItem, setActiveNavigationItem] =
    useState<NavigationItem>('overview')
  const [screen, setScreen] = useState<
    'configuration' | 'planner' | 'mission-control' | 'debrief'
  >('configuration')
  const isPlaybackRunningRef = useRef(false)
  const isAdvancingRef = useRef(false)
  const autoPauseOnTransitionsRef = useRef(true)
  const pendingNavigationTargetRef = useRef<string | null>(null)

  const setPlayback = useCallback((running: boolean, reason: string | null) => {
    isPlaybackRunningRef.current = running
    setIsPlaybackRunning(running)
    setPlaybackPauseReason(reason)
  }, [])

  const initializeMission = (
    schedule: ScheduleResult,
    spacecraftConfiguration = configuration,
  ): string[] => {
    const spacecraftValidation =
      validateSpacecraftConfiguration(spacecraftConfiguration)
    if (!spacecraftValidation.valid) {
      return spacecraftValidation.errors
    }

    if (!schedule.valid || schedule.errors.length > 0) {
      return schedule.errors.length > 0
        ? schedule.errors
        : ['Schedule is structurally invalid.']
    }

    if (schedule.scheduledObservations.length === 0) {
      return ['No executable observations remain in the schedule.']
    }

    const initialization = initializeMissionEngine({
      spacecraftConfiguration,
      observationCatalogue,
      missionEvents,
      schedule,
      missionWindowDurationMinutes:
        DEFAULT_MISSION_WINDOW_DURATION_MINUTES,
    })

    if (!initialization.valid || !initialization.state) {
      return initialization.errors.length > 0
        ? initialization.errors
        : ['Mission initialization failed.']
    }

    missionEngineStateRef.current = initialization.state
    setPlayback(false, null)
    if (spacecraftConfiguration !== configuration) {
      setConfiguration(spacecraftConfiguration)
    }
    setMissionEngineState(initialization.state)
    setMissionEventHistory([])
    setAdvancementErrors([])
    setScreen('mission-control')
    return []
  }

  const advanceMission = useCallback(
    (targetMinute: number, source: 'manual' | 'playback' = 'manual') => {
      if (
        isAdvancingRef.current ||
        (source === 'manual' && isPlaybackRunningRef.current)
      ) {
        return false
      }

      const currentState = missionEngineStateRef.current
      if (
        !currentState ||
        currentState.status === 'completed' ||
        currentState.currentTimeMinute >=
          currentState.missionWindowDurationMinutes
      ) {
        if (source === 'playback') {
          setPlayback(false, 'Mission window complete.')
        }
        return false
      }

      isAdvancingRef.current = true
      try {
        const result: MissionEngineAdvanceResult = advanceMissionTo(
          currentState,
          targetMinute,
        )
        if (!result.valid || !result.state) {
          const errors =
            result.errors.length > 0
              ? result.errors
              : ['Mission time could not be advanced.']
          setAdvancementErrors(errors)
          if (source === 'playback') {
            setPlayback(false, `Playback paused: ${errors.join(' ')}`)
          }
          return false
        }

        const updatedState = result.state
        missionEngineStateRef.current = updatedState
        setMissionEngineState(updatedState)
        setAdvancementErrors([])

        const appliedEntries: MissionEventLogEntry[] =
          result.appliedEvents.map((event, index) => ({
            id: `applied-${event.id}`,
            title: event.title,
            timeMinute: event.triggerTimeMinute,
            outcome: 'applied',
            category: event.category,
            detail: result.messages[index] ?? event.description,
          }))
        const rejectedEntries: MissionEventLogEntry[] =
          result.rejectedEvents.map((rejection) => {
            const event = currentState.missionEvents.find(
              (candidate: MissionEvent) => candidate.id === rejection.eventId,
            )
            return {
              id: `rejected-${rejection.eventId}`,
              title: event?.title ?? rejection.eventId,
              timeMinute:
                event?.triggerTimeMinute ?? updatedState.currentTimeMinute,
              outcome: 'rejected',
              category: event?.category,
              detail: rejection.reason,
            }
          })

        if (appliedEntries.length > 0 || rejectedEntries.length > 0) {
          setMissionEventHistory((history) =>
            [...history, ...appliedEntries, ...rejectedEntries].sort(
              (left, right) => left.timeMinute - right.timeMinute,
            ),
          )
        }

        if (source === 'playback') {
          const missionEnded =
            updatedState.status === 'completed' ||
            updatedState.currentTimeMinute >=
              updatedState.missionWindowDurationMinutes
          const observationTransition =
            updatedState.completedObservationIds.length >
              currentState.completedObservationIds.length ||
            updatedState.interruptedObservations.length >
              currentState.interruptedObservations.length ||
            (updatedState.activeObservation !== null &&
              updatedState.activeObservation.observationId !==
                currentState.activeObservation?.observationId &&
              updatedState.activeObservation.startedAtMinute >
                currentState.currentTimeMinute)
          const eventTransition =
            result.appliedEvents.length > 0 ||
            result.rejectedEvents.length > 0

          if (missionEnded) {
            setPlayback(false, 'Mission window complete.')
          } else if (
            autoPauseOnTransitionsRef.current &&
            eventTransition
          ) {
            const eventTitle =
              result.appliedEvents[0]?.title ??
              currentState.missionEvents.find(
                (event) => event.id === result.rejectedEvents[0]?.eventId,
              )?.title ??
              'Mission event'
            setPlayback(false, `Playback paused at event: ${eventTitle}.`)
          } else if (
            autoPauseOnTransitionsRef.current &&
            observationTransition
          ) {
            const observationName = updatedState.activeObservation
              ? updatedState.missionEventState.observationCatalogue.find(
                  (observation) =>
                    observation.id ===
                    updatedState.activeObservation?.observationId,
                )?.name
              : null
            setPlayback(
              false,
              observationName
                ? `Playback paused at observation transition: ${observationName}.`
                : 'Playback paused at an observation transition.',
            )
          }
        }
        return true
      } finally {
        isAdvancingRef.current = false
      }
    },
    [setPlayback],
  )

  const togglePlayback = () => {
    if (isPlaybackRunningRef.current) {
      setPlayback(false, 'Playback paused by player.')
      return
    }

    const currentState = missionEngineStateRef.current
    if (
      !currentState ||
      currentState.status === 'completed' ||
      currentState.currentTimeMinute >=
        currentState.missionWindowDurationMinutes
    ) {
      return
    }
    setPlayback(true, null)
  }

  const updateAutoPause = (enabled: boolean) => {
    autoPauseOnTransitionsRef.current = enabled
    setAutoPauseOnTransitions(enabled)
  }

  useEffect(() => {
    if (
      screen !== 'mission-control' ||
      !isPlaybackRunning ||
      !missionEngineState
    ) {
      return
    }

    const timerId = window.setTimeout(() => {
      const currentState = missionEngineStateRef.current
      if (!currentState) {
        setPlayback(false, 'No active mission is available.')
        return
      }

      const boundary = getNextMissionBoundary(currentState)
      const targetMinute = Math.min(
        currentState.currentTimeMinute + 1,
        boundary ?? currentState.missionWindowDurationMinutes,
      )
      if (targetMinute <= currentState.currentTimeMinute) {
        setPlayback(false, 'Mission window complete.')
        return
      }

      advanceMission(targetMinute, 'playback')
    }, 1000 / playbackSpeed)

    return () => window.clearTimeout(timerId)
  }, [
    advanceMission,
    isPlaybackRunning,
    missionEngineState,
    playbackSpeed,
    screen,
    setPlayback,
  ])

  useEffect(() => {
    if (screen !== 'mission-control' && isPlaybackRunningRef.current) {
      setPlayback(false, 'Playback paused when leaving Mission Control.')
    }
  }, [screen, setPlayback])

  useEffect(() => {
    const target = pendingNavigationTargetRef.current
    if (screen !== 'configuration' || !target) return

    pendingNavigationTargetRef.current = null
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [screen])

  const navigateToConfigurationSection = (
    target: string,
    navigationItem: NavigationItem,
  ) => {
    setActiveNavigationItem(navigationItem)
    if (screen === 'configuration') {
      document.getElementById(target)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      })
      return
    }

    pendingNavigationTargetRef.current = target
    setScreen('configuration')
  }

  const replayMission = (): string[] => {
    const completedMission = missionEngineStateRef.current
    if (!completedMission) {
      return ['No mission is available to replay.']
    }
    const spacecraftConfiguration =
      completedMission.missionEventState.spacecraftConfiguration
    const schedule = scheduleObservations(
      selectedObservationIds,
      observationCatalogue,
      spacecraftConfiguration,
    )
    return initializeMission(schedule, spacecraftConfiguration)
  }

  const missionOrbitalScene = useMemo(
    () => (
      <Suspense
        fallback={
          <div className="absolute inset-0 grid place-items-center bg-[#020611] text-xs tracking-[0.16em] text-slate-400">
            LOADING ORBITAL ENVIRONMENT
          </div>
        }
      >
        <GameCanvas configuration={configuration} missionState={missionEngineState} />
      </Suspense>
    ),
    [configuration, missionEngineState],
  )

  const missionObjectivesResult = useMemo(
    () =>
      missionEngineState
        ? evaluateMissionObjectives(
            missionObjectives,
            missionEngineState.schedule,
            missionEngineState.completedObservationIds,
          )
        : [],
    [missionEngineState],
  )
  const missionScore = useMemo(
    () =>
      missionEngineState
        ? calculateMissionScore({
            schedule: missionEngineState.schedule,
            completedObservationIds: missionEngineState.completedObservationIds,
            objectives: missionObjectivesResult,
            operationalFailures: missionEngineState.operationalFailures,
            spacecraftSpecifications:
              missionEngineState.missionEventState.spacecraftSpecifications,
            actualEnergyConsumptionWh: missionEngineState.actualEnergyConsumptionWh,
            actualDataGeneratedMB: missionEngineState.actualDataGeneratedMB,
          })
        : null,
    [missionEngineState, missionObjectivesResult],
  )

  const resetMission = (nextScreen: 'configuration' | 'planner') => {
    missionEngineStateRef.current = null
    setMissionEngineState(null)
    setMissionEventHistory([])
    setAdvancementErrors([])
    setPlayback(false, null)
    setSelectedObservationIds([])
    setActiveNavigationItem(
      nextScreen === 'configuration' ? 'designer' : 'observations',
    )
    if (nextScreen === 'configuration') {
      pendingNavigationTargetRef.current = 'spacecraft-configuration-heading'
    }
    setScreen(nextScreen)
  }

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      {screen !== 'mission-control' && screen !== 'debrief' && (
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#0b1220] lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
            <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-400">
              <Satellite size={23} />
            </div>
            <div>
              <h1 className="font-bold">MISSION WINDOW</h1>
              <p className="text-[10px] tracking-widest text-slate-500">
                SPACE OPERATIONS
              </p>
            </div>
          </div>

          <nav className="space-y-2 p-4 text-sm">
            <button
              type="button"
              onClick={() =>
                navigateToConfigurationSection('orbital-overview', 'overview')
              }
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left ${
                activeNavigationItem === 'overview'
                  ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Activity size={18} />
              Mission overview
            </button>
            <button
              type="button"
              onClick={() =>
                navigateToConfigurationSection(
                  'spacecraft-configuration-heading',
                  'designer',
                )
              }
              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                activeNavigationItem === 'designer'
                  ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Satellite size={18} />
              Spacecraft designer
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNavigationItem('observations')
                setScreen('planner')
              }}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                activeNavigationItem === 'observations'
                  ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Target size={18} />
              Observations
            </button>
            <button
              type="button"
              onClick={() =>
                navigateToConfigurationSection(
                  'communication-system',
                  'communications',
                )
              }
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left ${
                activeNavigationItem === 'communications'
                  ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Radio size={18} />
              Communications
            </button>
          </nav>

          <div className="m-4 mt-auto rounded-xl border border-white/10 p-4">
            <p className="text-xs text-emerald-400">● SYSTEMS ONLINE</p>
            <p className="mt-2 text-xs text-slate-500">
              Mission Window Simulator v1.0
            </p>
          </div>
        </aside>
      )}

      <main
        className={
          screen === 'mission-control' || screen === 'debrief'
            ? 'min-h-screen'
            : 'lg:ml-64'
        }
      >
        {screen !== 'mission-control' && screen !== 'debrief' && (
          <header className="flex h-20 items-center justify-between border-b border-white/10 px-5 md:px-10">
            <div>
              <p className="text-xs tracking-widest text-slate-500">
                {screen === 'configuration'
                  ? 'MISSION / ORBITAL ENVIRONMENT'
                  : 'MISSION / OBSERVATION PLANNER'}
              </p>
              <h2 className="mt-1 font-semibold">
                {screen === 'configuration'
                  ? 'Orbital Operations'
                  : 'Manual Observation Planner'}
              </h2>
            </div>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-300">
              {screen === 'configuration' ? 'VISUAL PREVIEW' : 'MANUAL PLANNING'}
            </span>
          </header>
        )}

        {screen === 'configuration' ? (
          <div className="mx-auto max-w-375 space-y-12 p-5 md:p-10">
            <section
              id="orbital-overview"
              aria-label="Orbital environment preview"
              className="relative isolate h-[min(72vh,760px)] min-h-[480px] overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#020611] shadow-2xl shadow-cyan-950/20"
            >
              <Suspense
                fallback={
                  <div className="absolute inset-0 grid place-items-center text-xs tracking-[0.16em] text-slate-500">
                    LOADING ORBITAL ENVIRONMENT
                  </div>
                }
              >
                <GameCanvas configuration={configuration} />
              </Suspense>
            </section>

            <section aria-labelledby="spacecraft-configuration-heading">
              <div className="mb-6">
                <p className="text-xs font-semibold tracking-[0.2em] text-cyan-400">
                  SPACECRAFT ENGINEERING / CONFIGURATION
                </p>
                <h2
                  id="spacecraft-configuration-heading"
                  className="mt-2 text-2xl font-bold"
                >
                  Spacecraft Configuration
                </h2>
              </div>
              <SpacecraftDesigner
                configuration={configuration}
                setConfiguration={setConfiguration}
                onContinueToPlanner={() => {
                  setActiveNavigationItem('observations')
                  setScreen('planner')
                }}
              />
            </section>
          </div>
        ) : screen === 'planner' ? (
          <div className="mx-auto max-w-375 p-5 md:p-10">
            <MissionPlanner
              spacecraftConfiguration={configuration}
              selectedObservationIds={selectedObservationIds}
              onSelectionChange={setSelectedObservationIds}
              onBack={() =>
                navigateToConfigurationSection(
                  'spacecraft-configuration-heading',
                  'designer',
                )
              }
              onLaunch={initializeMission}
            />
          </div>
        ) : screen === 'mission-control' && missionEngineState ? (
          <div className="mx-auto max-w-[1680px] p-3 sm:p-5 lg:p-7">
            <MissionControl
              missionState={missionEngineState}
              selectedObservationIds={selectedObservationIds}
              eventHistory={missionEventHistory}
              advancementErrors={advancementErrors}
              onAdvanceTo={advanceMission}
              isPlaybackRunning={isPlaybackRunning}
              playbackSpeed={playbackSpeed}
              autoPauseOnTransitions={autoPauseOnTransitions}
              playbackPauseReason={playbackPauseReason}
              onTogglePlayback={togglePlayback}
              onPlaybackSpeedChange={setPlaybackSpeed}
              onAutoPauseChange={updateAutoPause}
              orbitalScene={missionOrbitalScene}
              onOpenDebrief={() => setScreen('debrief')}
            />
          </div>
        ) : screen === 'debrief' && missionEngineState && missionScore ? (
          <MissionDebrief
            missionState={missionEngineState}
            objectives={missionObjectivesResult}
            score={missionScore}
            onReturnToMissionControl={() => setScreen('mission-control')}
            onReplayMission={replayMission}
            onPlanAnotherMission={() => resetMission('planner')}
            onRedesignSpacecraft={() => resetMission('configuration')}
          />
        ) : null}
      </main>
    </div>
  )
}

export default App
