import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  BatteryCharging,
  Clock3,
  Database,
  Pause,
  Play,
  Radio,
  Satellite,
  Zap,
  Flame,
  RadioTower,
} from 'lucide-react'
import {
  communicationSystems,
  instruments,
  powerSystems,
  storageSystems,
} from '../../data/spacecraftOptions'
import { audioTelemetry } from '../../utils/audioTelemetry'
import {
  calculateRemainingBattery,
  calculateRemainingStorage,
} from '../../simulation/calculations'
import type {
  MissionEngineState,
  InterruptedObservation,
} from '../../simulation/missionEngine'

type PlaybackSpeed = 1 | 2 | 4
const playbackSpeeds: PlaybackSpeed[] = [1, 2, 4]

export interface MissionEventLogEntry {
  id: string
  title: string
  timeMinute: number
  outcome: 'applied' | 'rejected'
  category?: string
  detail: string
}

interface MissionControlProps {
  missionState: MissionEngineState
  selectedObservationIds: string[]
  eventHistory: MissionEventLogEntry[]
  advancementErrors: string[]
  onAdvanceTo: (targetMinute: number) => void
  isPlaybackRunning: boolean
  playbackSpeed: PlaybackSpeed
  autoPauseOnTransitions: boolean
  playbackPauseReason: string | null
  onTogglePlayback: () => void
  onPlaybackSpeedChange: (speed: PlaybackSpeed) => void
  onAutoPauseChange: (enabled: boolean) => void
  onOpenDebrief: () => void
  orbitalScene: ReactNode
}

function MissionControl({
  missionState,
  selectedObservationIds,
  eventHistory,
  advancementErrors,
  onAdvanceTo,
  isPlaybackRunning,
  playbackSpeed,
  autoPauseOnTransitions,
  playbackPauseReason,
  onTogglePlayback,
  onPlaybackSpeedChange,
  onAutoPauseChange,
  onOpenDebrief,
  orbitalScene,
}: MissionControlProps) {
  const specifications =
    missionState.missionEventState.spacecraftSpecifications
  const spacecraftConfiguration =
    missionState.missionEventState.spacecraftConfiguration
  const remainingBatteryWh = Math.max(
    0,
    calculateRemainingBattery(
      specifications.batteryCapacity,
      missionState.actualEnergyConsumptionWh,
    ),
  )
  const remainingStorageMB = Math.max(
    0,
    calculateRemainingStorage(
      specifications.storageCapacity,
      missionState.actualDataGeneratedMB,
    ),
  )
  const instrumentPowerIncrease = Object.values(
    missionState.missionEventState.instrumentPowerIncreasesWatts,
  ).reduce((total, increase) => total + increase, 0)
  const currentInstrumentPower =
    specifications.totalInstrumentPower + instrumentPowerIncrease
  const missionEnded =
    missionState.status === 'completed' ||
    missionState.currentTimeMinute >= missionState.missionWindowDurationMinutes
  const nextBoundary = getNextMissionBoundary(missionState)
  const latestEvent = eventHistory[eventHistory.length - 1]
  const [activeManeuver, setActiveManeuver] = useState<string | null>(null)

  const triggerAttitudeTrim = () => {
    audioTelemetry.playThrusterManeuver()
    setActiveManeuver(
      'Attitude RCS Pulse Complete • Solar Panels Realigned to Sunlight (+3.5W)',
    )
    setTimeout(() => setActiveManeuver(null), 4500)
  }

  const triggerDownlinkBurst = () => {
    audioTelemetry.playClick()
    setActiveManeuver(
      'Ground DSN Lock Acquired (Goldstone Deep Space Station) • Telemetry Buffer Flushed',
    )
    setTimeout(() => setActiveManeuver(null), 4500)
  }
  const observationById = new Map(
    missionState.missionEventState.observationCatalogue.map((observation) => [
      observation.id,
      observation,
    ]),
  )
  const scheduledObservations = missionState.schedule.scheduledObservations
  const rejectedObservations = missionState.schedule.rejectedObservations
  const completedCount = missionState.completedObservationIds.length
  const missionProgress = Math.min(
    100,
    (missionState.currentTimeMinute /
      missionState.missionWindowDurationMinutes) *
      100,
  )
  const batteryPercent = percentageOf(
    remainingBatteryWh,
    specifications.batteryCapacity,
  )
  const storagePercent = percentageOf(
    remainingStorageMB,
    specifications.storageCapacity,
  )
  const activeObservationName = missionState.activeObservation
    ? observationById.get(missionState.activeObservation.observationId)?.name ??
      missionState.activeObservation.observationId
    : null
  const powerSystem = powerSystems.find(
    (item) => item.id === spacecraftConfiguration.powerSystemId,
  )
  const communicationSystem = communicationSystems.find(
    (item) => item.id === spacecraftConfiguration.communicationSystemId,
  )
  const storageSystem = storageSystems.find(
    (item) => item.id === spacecraftConfiguration.storageSystemId,
  )
  const instrumentNames = spacecraftConfiguration.instrumentIds.map(
    (instrumentId) =>
      instruments.find((instrument) => instrument.id === instrumentId)?.name ??
      instrumentId,
  )

  return (
    <div className="space-y-5 lg:space-y-6">
      <section
        aria-label="Orbital mission environment"
        className="mission-viewport relative isolate h-[min(88vh,1100px)] min-h-[860px] overflow-hidden rounded-3xl border border-white/[0.1] bg-[#000000] shadow-[0_24px_60px_rgba(0,0,0,0.8)] xl:h-[min(76vh,900px)] xl:min-h-[650px]"
      >
        <div className="absolute inset-0">{orbitalScene}</div>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#000000]/60 via-transparent to-[#000000]/90" />

        <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-6 lg:p-7">
          <div className="flex items-start justify-between gap-3 sm:gap-6">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/15 text-[#2997ff] shadow-lg backdrop-blur-2xl">
                <Satellite size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.24em] text-[#2997ff] uppercase">
                  Mission Window
                </p>
                <h1 className="mt-0.5 truncate text-base font-semibold tracking-tight text-white apple-headline">
                  Orbital Science Mission
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      missionEnded ? 'bg-amber-400' : 'bg-[#34c759]'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      missionEnded ? 'bg-amber-400' : 'bg-[#34c759]'
                    }`} />
                  </span>
                  <span className="text-[10px] font-medium tracking-[0.16em] text-[#86868b] uppercase">
                    {missionEnded
                      ? 'Mission Complete'
                      : missionState.status === 'ready'
                        ? 'Simulation Ready'
                        : 'Active Orbit'}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-[#161617]/75 px-4 py-2.5 text-right shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-end gap-1.5 text-[#2997ff]">
                <Clock3 size={13} />
                <span className="text-[10px] font-semibold tracking-[0.16em] text-[#86868b] uppercase">
                  Mission Elapsed
                </span>
              </div>
              <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-white">
                T+{formatMinuteClock(missionState.currentTimeMinute)}
              </p>
              <p className="text-[10px] tracking-wide text-[#86868b]">
                {formatMinuteClock(missionState.missionWindowDurationMinutes)} MIN WINDOW
              </p>
            </div>
          </div>

          {activeManeuver && (
            <div
              role="status"
              className="mission-event-toast ml-auto mt-3 w-full max-w-md rounded-2xl border border-[#0071e3]/40 bg-[#161617]/90 p-4 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2997ff] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2997ff]" />
                </span>
                <span className="text-[10px] font-semibold tracking-[0.18em] text-[#2997ff] uppercase">
                  Flight Director Command Executed
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-white">{activeManeuver}</p>
            </div>
          )}

          {latestEvent && (
            <div
              key={latestEvent.id}
              role="status"
              className="mission-event-toast ml-auto mt-3 w-full max-w-md rounded-2xl border border-amber-400/25 bg-[#1c1c1e]/85 p-4 shadow-2xl backdrop-blur-2xl sm:mt-4"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-semibold tracking-[0.18em] text-amber-300 uppercase">
                  {latestEvent.outcome === 'applied'
                    ? 'Mission Event'
                    : 'Event Skipped'}
                </span>
                <span className="ml-auto text-[10px] font-mono text-[#86868b]">
                  T+{formatQuantity(latestEvent.timeMinute)} MIN
                </span>
              </div>
              <p className="mt-1.5 truncate text-xs font-semibold text-white tracking-tight sm:text-sm">
                {latestEvent.title}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#86868b]">
                {latestEvent.detail}
              </p>
            </div>
          )}

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,1.15fr)_minmax(240px,0.78fr)] xl:items-end">
            <section
              aria-label="Live mission telemetry"
              className="grid grid-cols-2 gap-2.5"
            >
              <TelemetryCard
                icon={<BatteryCharging size={14} />}
                label="BATTERY"
                value={`${formatQuantity(remainingBatteryWh)} Wh`}
                detail={`${Math.round(batteryPercent)}% available`}
                percentage={batteryPercent}
                accent="cyan"
              />
              <TelemetryCard
                icon={<Zap size={14} />}
                label="SOLAR GENERATION"
                value={`${formatQuantity(specifications.solarGeneration)} W`}
                detail="Solar array output"
                accent="cyan"
              />
              <TelemetryCard
                icon={<Radio size={14} />}
                label="INSTRUMENT LOAD"
                value={`${formatQuantity(currentInstrumentPower)} W`}
                detail={
                  activeObservationName
                    ? `Active · ${activeObservationName}`
                    : 'Standby load'
                }
                accent="blue"
              />
              <TelemetryCard
                icon={<Database size={14} />}
                label="DATA STORAGE"
                value={`${formatQuantity(remainingStorageMB)} MB`}
                detail={`${Math.round(storagePercent)}% available`}
                percentage={storagePercent}
                accent="blue"
              />
            </section>

            <section
              aria-label="Mission time controls"
              className="rounded-3xl border border-white/[0.08] apple-glass p-4 sm:p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-[#86868b] uppercase">
                    Mission Timeline
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-white tracking-tight">
                    {activeObservationName
                      ? `Acquiring · ${activeObservationName}`
                      : missionEnded
                        ? 'Execution window closed'
                        : 'Observation sequence standby'}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-white">
                  {formatQuantity(missionState.currentTimeMinute)} /{' '}
                  {formatQuantity(missionState.missionWindowDurationMinutes)} MIN
                </span>
              </div>
              <div
                role="meter"
                aria-label="Mission time elapsed"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(missionProgress)}
                className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2997ff] to-[#0071e3] transition-[width] duration-500"
                  style={{ width: `${missionProgress}%` }}
                />
              </div>
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={onTogglePlayback}
                  disabled={missionEnded}
                  aria-label={
                    isPlaybackRunning ? 'Pause mission playback' : 'Play mission'
                  }
                  className={`apple-pill-btn flex min-w-[110px] items-center justify-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold tracking-wider uppercase transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                    isPlaybackRunning
                      ? 'border border-amber-400/30 bg-amber-400/15 text-amber-200 shadow-sm'
                      : 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-[0_2px_12px_rgba(0,113,227,0.35)]'
                  }`}
                >
                  {isPlaybackRunning ? <Pause size={12} /> : <Play size={12} />}
                  {isPlaybackRunning ? 'Pause' : 'Play'}
                </button>
                <div
                  role="group"
                  aria-label="Simulation playback speed"
                  className="flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] p-1"
                >
                  {playbackSpeeds.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      aria-label={`Set playback speed to ${speed} times`}
                      aria-pressed={playbackSpeed === speed}
                      onClick={() => onPlaybackSpeedChange(speed)}
                      disabled={missionEnded}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        playbackSpeed === speed
                          ? 'bg-white/[0.15] text-white shadow-sm'
                          : 'text-[#86868b] hover:text-white'
                      }`}
                    >
                      {speed}×
                    </button>
                  ))}
                </div>
                <span
                  aria-live="polite"
                  className={`text-[9px] font-semibold tracking-[0.14em] uppercase ${
                    isPlaybackRunning ? 'text-[#34c759]' : 'text-[#86868b]'
                  }`}
                >
                  {isPlaybackRunning
                    ? `Running · ${playbackSpeed}×`
                    : missionEnded
                      ? 'Complete'
                      : playbackPauseReason
                        ? 'Paused'
                        : 'Ready'}
                </span>
              </div>
              <label className="mt-2.5 flex cursor-pointer items-center justify-between gap-3 text-[10px] text-[#86868b]">
                <span>Pause at events & observation changes</span>
                <input
                  type="checkbox"
                  checked={autoPauseOnTransitions}
                  onChange={(event) => onAutoPauseChange(event.target.checked)}
                  className="accent-[#0071e3] rounded cursor-pointer"
                />
              </label>
              {playbackPauseReason && !isPlaybackRunning && (
                <p
                  role="status"
                  className="mt-2 text-[10px] leading-relaxed text-amber-200/80"
                >
                  {playbackPauseReason}
                </p>
              )}
              <div className="mt-3.5 grid grid-cols-3 gap-2">
                <TimeControlButton
                  label="+1 MIN"
                  onClick={() =>
                    onAdvanceTo(
                      Math.min(
                        missionState.currentTimeMinute + 1,
                        missionState.missionWindowDurationMinutes,
                      ),
                    )
                  }
                  disabled={missionEnded || isPlaybackRunning}
                />
                <TimeControlButton
                  label="+3 MIN"
                  onClick={() =>
                    onAdvanceTo(
                      Math.min(
                        missionState.currentTimeMinute + 3,
                        missionState.missionWindowDurationMinutes,
                      ),
                    )
                  }
                  disabled={missionEnded || isPlaybackRunning}
                />
                <TimeControlButton
                  label="NEXT BOUNDARY"
                  onClick={() => {
                    if (nextBoundary !== null) onAdvanceTo(nextBoundary)
                  }}
                  disabled={
                    missionEnded || isPlaybackRunning || nextBoundary === null
                  }
                />
              </div>

              <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">Flight Actions:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={triggerAttitudeTrim}
                    disabled={missionEnded}
                    title="Fire attitude control RCS thrusters to optimize solar panel angle"
                    className="apple-pill-btn flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 text-[10px] font-medium text-amber-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Flame size={12} className="text-amber-400" /> RCS Sun Trim
                  </button>
                  <button
                    type="button"
                    onClick={triggerDownlinkBurst}
                    disabled={missionEnded}
                    title="Prioritize Deep Space Network ground station downlink"
                    className="apple-pill-btn flex items-center gap-1.5 rounded-full border border-[#0071e3]/30 bg-[#0071e3]/10 hover:bg-[#0071e3]/20 px-3 py-1.5 text-[10px] font-medium text-[#2997ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <RadioTower size={12} /> DSN Lock
                  </button>
                </div>
              </div>
              {advancementErrors.length > 0 && (
                <div
                  role="alert"
                  className="mt-2 rounded-md border border-rose-300/15 bg-rose-400/5 px-2.5 py-2 text-[10px] text-rose-200"
                >
                  {advancementErrors.join(' ')}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/[0.08] apple-glass p-4 sm:p-5 shadow-2xl">
              <div className="mb-2.5 flex items-center gap-2">
                <Satellite size={14} className="text-[#2997ff]" />
                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#86868b] uppercase">
                  Spacecraft Systems
                </p>
              </div>
              <dl className="space-y-2">
                <CompactSummary
                  label="Power"
                  value={powerSystem?.name ?? spacecraftConfiguration.powerSystemId}
                />
                <CompactSummary
                  label="Comms"
                  value={
                    communicationSystem?.name ??
                    spacecraftConfiguration.communicationSystemId
                  }
                />
                <CompactSummary
                  label="Storage"
                  value={storageSystem?.name ?? spacecraftConfiguration.storageSystemId}
                />
              </dl>
              <p className="mt-3 border-t border-white/[0.08] pt-2.5 text-[10px] leading-relaxed text-[#86868b]">
                {instrumentNames.length > 0
                  ? instrumentNames.join(' · ')
                  : 'No instruments installed'}
              </p>
            </section>
          </div>
        </div>
      </section>

      {missionEnded && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#0071e3]/30 bg-[#0071e3]/10 px-5 py-4 text-xs text-white sm:flex-row sm:items-center sm:justify-between apple-glass">
          <p role="status" className="font-medium">
            Mission window complete. Telemetry recorded and ready for final flight evaluation.
          </p>
          <button
            type="button"
            onClick={onOpenDebrief}
            className="apple-pill-btn bg-[#0071e3] hover:bg-[#0077ed] px-5 py-2 text-xs font-medium text-white shadow-[0_2px_12px_rgba(0,113,227,0.4)]"
          >
            Open Mission Debrief
          </button>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <section
          aria-labelledby="mission-sequence-heading"
          className="rounded-3xl border border-white/[0.08] apple-card p-5 sm:p-6 shadow-xl"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.22em] text-[#2997ff] uppercase">
                Flight Plan
              </p>
              <h2
                id="mission-sequence-heading"
                className="mt-1 text-base font-semibold tracking-tight text-white apple-headline"
              >
                Observation Sequence
              </h2>
            </div>
            <p className="text-[10px] text-[#86868b] font-medium">
              {completedCount} / {scheduledObservations.length} COMPLETE
              {selectedObservationIds.length > scheduledObservations.length &&
                ` · ${rejectedObservations.length} REJECTED`}
            </p>
          </div>

          <ol className="space-y-1">
            {scheduledObservations.map((observation, index) => {
              const details = observationById.get(observation.observationId)
              const isActive =
                missionState.activeObservation?.observationId ===
                observation.observationId
              const completed =
                missionState.completedObservationIds.includes(
                  observation.observationId,
                )
              const interruption = missionState.interruptedObservations.find(
                (item: InterruptedObservation) =>
                  item.observationId === observation.observationId,
              )
              const status = completed
                ? 'COMPLETED'
                : interruption
                  ? 'INTERRUPTED'
                  : isActive
                    ? 'IN PROGRESS'
                    : 'SCHEDULED'
              const progress = isActive
                ? Math.min(
                    100,
                    (missionState.activeObservation!.elapsedMinutes /
                      Math.max(
                        1,
                        observation.endMinute - observation.startMinute,
                      )) *
                      100,
                  )
                : 0

              return (
                <li
                  key={observation.observationId}
                  className={`relative rounded-lg border px-3 py-3 transition-colors sm:px-4 ${
                    isActive
                      ? 'border-cyan-200/25 bg-cyan-200/[0.06]'
                      : completed
                        ? 'border-emerald-200/10 bg-emerald-200/[0.025]'
                        : 'border-white/[0.06] bg-white/[0.015]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold tabular-nums ${
                        completed
                          ? 'border-emerald-200/30 text-emerald-200'
                          : isActive
                            ? 'border-cyan-200/40 text-cyan-100'
                            : 'border-white/10 text-slate-500'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <h3 className="truncate text-xs font-semibold text-slate-100 sm:text-sm">
                          {details?.name ?? observation.observationId}
                        </h3>
                        <span
                          className={`text-[9px] font-bold tracking-[0.12em] ${
                            completed
                              ? 'text-emerald-200'
                              : interruption
                                ? 'text-rose-200'
                                : isActive
                                  ? 'text-cyan-100'
                                    : 'text-slate-500'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                        <span>
                          T+{formatQuantity(observation.startMinute)}–{formatQuantity(observation.endMinute)} MIN
                        </span>
                        <span>
                          {formatQuantity(
                            observation.endMinute - observation.startMinute,
                          )}{' '}
                          MIN
                        </span>
                        {details && (
                          <span className="text-slate-400">
                            {instruments.find(
                              (instrument) =>
                                instrument.id === details.instrumentId,
                            )?.name ?? details.instrumentId}
                          </span>
                        )}
                        {completed && (
                          <span className="text-emerald-200">
                            SCIENCE +{formatQuantity(observation.scienceValue)}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full bg-cyan-200 transition-[width] duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                      {interruption?.reason && (
                        <p className="mt-2 text-[10px] leading-relaxed text-rose-200/80">
                          {interruption.reason}
                        </p>
                      )}
                    </div>
                    <ArrowRight
                      size={14}
                      className={`mt-1 hidden shrink-0 sm:block ${
                        isActive ? 'text-cyan-200' : 'text-slate-700'
                      }`}
                    />
                  </div>
                </li>
              )
            })}

            {rejectedObservations.map((rejection) => {
              const details = observationById.get(rejection.observationId)
              return (
                <li
                  key={`rejected-${rejection.observationId}`}
                  className="rounded-lg border border-rose-200/10 bg-rose-200/[0.025] px-3 py-3 sm:px-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rose-200/20 text-[9px] font-semibold text-rose-200">
                      —
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold text-slate-300">
                          {details?.name ?? rejection.observationId}
                        </h3>
                        <span className="text-[9px] font-bold tracking-[0.12em] text-rose-200">
                          REJECTED
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-rose-100/65">
                        {rejection.reason}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}

            {missionState.interruptedObservations
              .filter(
                (interruption) =>
                  !scheduledObservations.some(
                    (observation) =>
                      observation.observationId ===
                      interruption.observationId,
                  ),
              )
              .map((interruption) => (
                <li
                  key={`interrupted-${interruption.observationId}`}
                  className="rounded-lg border border-rose-200/10 bg-rose-200/[0.025] px-3 py-3 sm:px-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rose-200/20 text-[9px] font-semibold text-rose-200">
                      !
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        {observationById.get(interruption.observationId)?.name ??
                          interruption.observationId}
                      </p>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-rose-100/65">
                        {interruption.reason}
                      </p>
                    </div>
                    <span className="ml-auto text-[9px] font-bold tracking-[0.12em] text-rose-200">
                      INTERRUPTED
                    </span>
                  </div>
                </li>
              ))}
          </ol>
        </section>

        <section
          aria-labelledby="mission-events-heading"
          className="rounded-xl border border-white/10 bg-[#09111e]/90 p-4 sm:p-5"
        >
          <div className="mb-4">
            <p className="text-[9px] font-semibold tracking-[0.22em] text-amber-200/70">
              FLIGHT LOG
            </p>
            <h2
              id="mission-events-heading"
              className="mt-1 text-sm font-semibold tracking-wide text-white"
            >
              Mission events
            </h2>
          </div>
          {eventHistory.length === 0 ? (
            <p className="border-t border-white/[0.06] py-4 text-xs text-slate-500">
              No mission events recorded.
            </p>
          ) : (
            <ol className="divide-y divide-white/[0.06]">
              {[...eventHistory].reverse().map((event) => (
                <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        event.outcome === 'applied'
                          ? 'bg-cyan-200'
                          : 'bg-amber-200'
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-200">
                      {event.title}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-slate-500">
                      T+{formatQuantity(event.timeMinute)}
                    </span>
                  </div>
                  <p className="ml-3.5 mt-1.5 text-[10px] leading-relaxed text-slate-500">
                    {event.detail}
                  </p>
                  {event.category && (
                    <p className="ml-3.5 mt-1 text-[8px] font-semibold tracking-[0.14em] text-slate-600">
                      {event.category} · {event.outcome.toUpperCase()}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>
    </div>
  )
}

function TelemetryCard({
  icon,
  label,
  value,
  detail,
  percentage,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  percentage?: number
  accent: 'cyan' | 'blue'
}) {
  const accentColor = accent === 'cyan' ? 'text-[#2997ff]' : 'text-[#0071e3]'
  const meterGradient =
    accent === 'cyan'
      ? 'bg-gradient-to-r from-[#2997ff] to-[#0071e3]'
      : 'bg-gradient-to-r from-[#0071e3] to-indigo-500'

  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] apple-card px-3 py-3 shadow-lg backdrop-blur-2xl sm:px-3.5 sm:py-3.5">
      <div className="flex items-center gap-1.5">
        <span className={accentColor}>{icon}</span>
        <span className="truncate text-[9px] font-semibold tracking-[0.16em] text-[#86868b] uppercase">
          {label}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold tabular-nums text-white sm:text-base tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-[#86868b]">{detail}</p>
      {percentage !== undefined && (
        <div
          role="meter"
          aria-label={`${label} available`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentage)}
          className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.08]"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${meterGradient}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  )
}

function TimeControlButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="apple-pill-btn min-w-0 rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-[9px] font-semibold tracking-[0.08em] text-white/90 transition-all hover:bg-white/[0.1] hover:border-white/[0.2] disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-[#86868b] disabled:opacity-40"
    >
      {label}
    </button>
  )
}

function CompactSummary({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 text-[10px]">
      <dt className="shrink-0 text-[#86868b]">{label}</dt>
      <dd className="truncate text-right font-medium text-white tracking-tight">
        {value}
      </dd>
    </div>
  )
}

export function getNextMissionBoundary(
  state: MissionEngineState,
): number | null {
  const handledEventIds = new Set([
    ...state.missionEventState.appliedEventIds,
    ...state.rejectedMissionEvents.map((event) => event.eventId),
  ])
  const candidates = [
    ...state.missionEvents
      .filter((event) => !handledEventIds.has(event.id))
      .map((event) => event.triggerTimeMinute),
    ...state.schedule.scheduledObservations.flatMap((observation) => [
      observation.startMinute,
      observation.endMinute,
    ]),
    ...(state.activeObservation
      ? [state.activeObservation.plannedEndMinute]
      : []),
    ...state.missionEventState.instrumentFailurePeriods.flatMap((failure) => [
      failure.unavailableFromMinute,
      failure.unavailableUntilMinute,
    ]),
    state.missionWindowDurationMinutes,
  ]

  return (
    candidates
      .filter(
        (minute) =>
          Number.isFinite(minute) && minute > state.currentTimeMinute,
      )
      .sort((left, right) => left - right)[0] ?? null
  )
}

function percentageOf(value: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0
}

function formatMinuteClock(minutes: number): string {
  const wholeMinutes = Math.floor(minutes)
  const seconds = Math.round((minutes - wholeMinutes) * 60)
  return `${String(wholeMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatQuantity(value: number): string {
  return Number(value.toFixed(2)).toString()
}

export default MissionControl
