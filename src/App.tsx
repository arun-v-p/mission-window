
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Satellite, Activity, Target, Radio, Volume2, VolumeX, Rocket } from 'lucide-react'
import { audioTelemetry } from './utils/audioTelemetry'
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
const SpaceRunnerGame = lazy(() => import('./game/runner/SpaceRunnerGame'))

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
  const [isMuted, setIsMuted] = useState(audioTelemetry.getMuted())
  const [isRunnerModeActive, setIsRunnerModeActive] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.has('game') || params.has('play') || params.has('runner') || params.has('odyssey')) {
        return true
      }
      // On mobile phones or direct visits, open directly into the 3D Light-Speed Odyssey experience
      if (window.innerWidth < 1024) {
        return true
      }
    }
    return false
  })
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
    audioTelemetry.playQuindarTone()
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
            audioTelemetry.playWarningAlert()
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

  if (isRunnerModeActive) {
    return (
      <div className="fixed inset-0 z-[100] h-screen w-screen bg-black overflow-hidden">
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white">
              <div className="text-center space-y-3">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#2997ff]" />
                <p className="text-xs font-mono tracking-[0.2em] text-[#86868b]">PREPARING LAUNCH PAD...</p>
              </div>
            </div>
          }
        >
          <SpaceRunnerGame onExit={() => setIsRunnerModeActive(false)} />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] selection:bg-[#0071e3] selection:text-white">
      {screen !== 'mission-control' && screen !== 'debrief' && (
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/[0.08] bg-[#161617]/75 backdrop-blur-2xl lg:flex lg:flex-col z-30">
          <div className="flex h-20 items-center gap-3 border-b border-white/[0.08] px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0071e3]/15 text-[#2997ff] border border-[#0071e3]/20 shadow-sm">
              <Satellite size={20} />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-white text-sm">MISSION WINDOW</h1>
              <p className="text-[10px] tracking-[0.2em] text-[#86868b] font-medium">
                NASA ORBITAL
              </p>
            </div>
          </div>

          <nav className="space-y-1.5 p-4 text-sm font-medium">
            <button
              type="button"
              onClick={() =>
                navigateToConfigurationSection('orbital-overview', 'overview')
              }
              className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left transition-all duration-200 ${
                activeNavigationItem === 'overview'
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.12]'
                  : 'text-[#86868b] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Activity size={17} />
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
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-left transition-all duration-200 w-full ${
                activeNavigationItem === 'designer'
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.12]'
                  : 'text-[#86868b] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Satellite size={17} />
              Spacecraft designer
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNavigationItem('observations')
                setScreen('planner')
              }}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-left transition-all duration-200 w-full ${
                activeNavigationItem === 'observations'
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.12]'
                  : 'text-[#86868b] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Target size={17} />
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
              className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left transition-all duration-200 ${
                activeNavigationItem === 'communications'
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.12]'
                  : 'text-[#86868b] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Radio size={17} />
              Communications
            </button>
          </nav>

          <div className="mx-4 my-2 p-3.5 rounded-2xl bg-gradient-to-br from-[#0071e3]/20 via-[#bf5af2]/15 to-transparent border border-[#2997ff]/30 shadow-lg shadow-[#0071e3]/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-[#ff375f] animate-ping" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff375f]">Hackathon Arcade</span>
            </div>
            <p className="text-xs font-semibold text-white leading-tight">Light-Speed Odyssey</p>
            <p className="text-[11px] text-[#86868b] mt-1 mb-3">Subway Surfers in deep space with rockets, lasers & alien battles.</p>
            <button
              type="button"
              onClick={() => {
                audioTelemetry.playClick()
                setIsRunnerModeActive(true)
              }}
              className="w-full apple-pill-btn flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white py-2 text-xs font-semibold shadow-md transition-all hover:scale-[1.02]"
            >
              <Rocket size={14} />
              Launch Game
            </button>
          </div>

          <div className="m-4 mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34c759] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34c759]"></span>
              </span>
              <p className="text-xs font-medium text-[#34c759] tracking-wide">SYSTEMS NOMINAL</p>
            </div>
            <p className="mt-2 text-[11px] text-[#86868b]">
              Mission Window Pro • v1.0
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
          <header className="sticky top-0 z-20 flex flex-wrap min-h-16 md:h-20 items-center justify-between border-b border-white/[0.08] bg-[#000000]/70 backdrop-blur-2xl px-4 md:px-10 py-2.5 gap-2">
            <div>
              <p className="text-[10px] md:text-[11px] font-medium tracking-[0.2em] text-[#86868b] uppercase">
                {screen === 'configuration'
                  ? 'Mission / Orbital Operations'
                  : 'Mission / Planner'}
              </p>
              <h2 className="font-semibold text-base md:text-lg text-white tracking-tight">
                {screen === 'configuration'
                  ? 'Spacecraft Systems'
                  : 'Observation Planner'}
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  audioTelemetry.playClick()
                  setIsRunnerModeActive(true)
                }}
                className="apple-pill-btn flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-[#0071e3] to-[#af52de] hover:opacity-90 px-3.5 sm:px-4 py-1.5 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(0,113,227,0.4)] transition-all hover:scale-[1.02]"
              >
                <Rocket size={13} className="animate-pulse" />
                <span>Play Light-Speed Odyssey</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                  3D
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = audioTelemetry.toggleMute()
                  setIsMuted(next)
                  if (!next) audioTelemetry.playClick()
                }}
                title="Toggle NASA flight telemetry sound synthesizer"
                className="apple-pill-btn flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] px-2.5 sm:px-3.5 py-1.5 text-xs text-[#f5f5f7] transition"
              >
                {isMuted ? (
                  <VolumeX size={13} className="text-[#86868b]" />
                ) : (
                  <Volume2 size={13} className="text-[#2997ff]" />
                )}
                <span className="font-medium text-[11px] hidden sm:inline">
                  {isMuted ? 'Muted' : 'Audio'}
                </span>
              </button>
              <span className="hidden md:inline-flex rounded-full border border-white/[0.12] bg-white/[0.06] backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-[#f5f5f7]">
                {screen === 'configuration' ? 'Visual Preview' : 'Manual Planning'}
              </span>
            </div>
          </header>
        )}

        {screen === 'configuration' ? (
          <div className="mx-auto max-w-375 space-y-12 p-6 md:p-10">
            {/* Hackathon Showcase Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-r from-[#0071e3]/20 via-[#bf5af2]/10 to-[#000000] p-6 md:p-8 backdrop-blur-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#2997ff]/20 px-2.5 py-0.5 text-[10px] font-semibold text-[#2997ff] border border-[#2997ff]/30">
                      HACKATHON 1ST PRIZE EDITION 🏆
                    </span>
                    <span className="text-[11px] font-mono text-[#86868b]">
                      3D ACTION ARCADE
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                    Light-Speed Odyssey
                  </h3>
                  <p className="text-sm text-[#86868b] leading-relaxed">
                    Cinematic rocket launch from Earth • 3-lane light-speed space runner • Inbuilt dual plasma lasers • Dodge asteroids & destroy hostile alien cruisers • 3 lives & planetary checkpoint respawns.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    audioTelemetry.playWarpJump()
                    setIsRunnerModeActive(true)
                  }}
                  className="apple-pill-btn flex items-center gap-2 rounded-full bg-white text-black hover:bg-neutral-200 px-6 py-3 text-sm font-semibold shadow-xl transition-all hover:scale-[1.03] shrink-0"
                >
                  <Rocket size={17} className="text-[#0071e3]" />
                  Launch Game Mode
                </button>
              </div>
            </div>

            <section
              id="orbital-overview"
              aria-label="Orbital environment preview"
              className="relative isolate h-[min(72vh,760px)] min-h-[480px] overflow-hidden rounded-3xl border border-white/[0.1] bg-[#000000] shadow-[0_24px_60px_rgba(0,0,0,0.8)]"
            >
              <Suspense
                fallback={
                  <div className="absolute inset-0 grid place-items-center text-xs tracking-[0.2em] text-[#86868b]">
                    INITIALIZING ORBITAL SIMULATION
                  </div>
                }
              >
                <GameCanvas configuration={configuration} />
              </Suspense>
            </section>

            <section aria-labelledby="spacecraft-configuration-heading">
              <div className="mb-8">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">
                  Spacecraft Engineering
                </p>
                <h2
                  id="spacecraft-configuration-heading"
                  className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight apple-headline"
                >
                  Configure Spacecraft
                </h2>
                <p className="mt-1 apple-subhead">
                  Select and balance flight-certified components for optimal orbital performance.
                </p>
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
