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
} from 'lucide-react'
import {
  communicationSystems,
  instruments,
  powerSystems,
  storageSystems,
} from '../../data/spacecraftOptions'
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
        className="mission-viewport relative isolate h-[min(88vh,1100px)] min-h-[860px] overflow-hidden rounded-xl border border-cyan-100/10 bg-[#020611] shadow-2xl shadow-black/50 sm:rounded-2xl xl:h-[min(76vh,900px)] xl:min-h-[650px]"
      >
        <div className="absolute inset-0">{orbitalScene}</div>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#030811]/65 via-transparent to-[#030811]/95" />

        <div className="relative z-10 flex h-full flex-col justify-between p-3 sm:p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3 sm:gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg border border-cyan-200/20 bg-[#061322]/80 p-2.5 text-cyan-200 shadow-lg shadow-cyan-950/30 backdrop-blur-md sm:p-3">
                <Satellite size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold tracking-[0.24em] text-cyan-200/75 sm:text-[10px]">
                  MISSION WINDOW
                </p>
                <h1 className="mt-1 truncate text-sm font-semibold tracking-wide text-white sm:text-base">
                  Orbital Science Mission
                </h1>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      missionEnded
                        ? 'bg-amber-300'
                        : 'animate-pulse bg-emerald-300'
                    }`}
                  />
                  <span className="text-[9px] font-semibold tracking-[0.16em] text-slate-300 sm:text-[10px]">
                    {missionEnded
                      ? 'MISSION COMPLETE'
                      : missionState.status === 'ready'
                        ? 'MISSION READY'
                        : 'MISSION IN PROGRESS'}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-lg border border-white/10 bg-[#061322]/80 px-3 py-2.5 text-right shadow-xl backdrop-blur-md sm:px-4 sm:py-3">
              <div className="flex items-center justify-end gap-2 text-cyan-200">
                <Clock3 size={14} />
                <span className="text-[9px] font-semibold tracking-[0.18em] text-slate-400 sm:text-[10px]">
                  MISSION ELAPSED
                </span>
              </div>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white sm:text-2xl">
                T+{formatMinuteClock(missionState.currentTimeMinute)}
              </p>
              <p className="text-[9px] tracking-wide text-slate-500 sm:text-[10px]">
                {formatMinuteClock(missionState.missionWindowDurationMinutes)}{' '}
                MIN WINDOW
              </p>
            </div>
          </div>

          {latestEvent && (
            <div
              key={latestEvent.id}
              role="status"
              className="mission-event-toast ml-auto mt-3 w-full max-w-md rounded-lg border border-amber-200/25 bg-[#111521]/90 p-3 shadow-xl backdrop-blur-xl sm:mt-4 sm:p-3.5"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                <span className="text-[9px] font-bold tracking-[0.18em] text-amber-200">
                  {latestEvent.outcome === 'applied'
                    ? 'MISSION EVENT'
                    : 'EVENT NOT APPLIED'}
                </span>
                <span className="ml-auto text-[9px] text-slate-500">
                  T+{formatQuantity(latestEvent.timeMinute)} MIN
                </span>
              </div>
              <p className="mt-1.5 truncate text-xs font-semibold text-slate-100 sm:text-sm">
                {latestEvent.title}
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-400 sm:text-xs">
                {latestEvent.detail}
              </p>
            </div>
          )}

          <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,1.15fr)_minmax(240px,0.78fr)] xl:items-end xl:gap-3">
            <section
              aria-label="Live mission telemetry"
              className="grid grid-cols-2 gap-2"
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
                detail="Current array output"
                accent="cyan"
              />
              <TelemetryCard
                icon={<Radio size={14} />}
                label="INSTRUMENT LOAD"
                value={`${formatQuantity(currentInstrumentPower)} W`}
                detail={
                  activeObservationName
                    ? `Active · ${activeObservationName}`
                    : 'No observation active'
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
              className="rounded-lg border border-cyan-100/10 bg-[#061322]/85 p-3 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                    MISSION TIMELINE
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-100">
                    {activeObservationName
                      ? `Acquiring · ${activeObservationName}`
                      : missionEnded
                        ? 'Execution window closed'
                        : 'Observation sequence standby'}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-cyan-100">
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
                className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-[width] duration-500"
                  style={{ width: `${missionProgress}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onTogglePlayback}
                  disabled={missionEnded}
                  aria-label={
                    isPlaybackRunning ? 'Pause mission playback' : 'Play mission'
                  }
                  className={`flex min-w-[105px] items-center justify-center gap-2 rounded-md border px-3 py-2 text-[9px] font-bold tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    isPlaybackRunning
                      ? 'border-amber-200/30 bg-amber-200/10 text-amber-100'
                      : 'border-cyan-200/25 bg-cyan-200/10 text-cyan-100 hover:bg-cyan-200/15'
                  }`}
                >
                  {isPlaybackRunning ? <Pause size={13} /> : <Play size={13} />}
                  {isPlaybackRunning ? 'PAUSE' : 'PLAY'}
                </button>
                <div
                  role="group"
                  aria-label="Simulation playback speed"
                  className="flex items-center rounded-md border border-white/10 bg-white/[0.025] p-0.5"
                >
                  {playbackSpeeds.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      aria-label={`Set playback speed to ${speed} times`}
                      aria-pressed={playbackSpeed === speed}
                      onClick={() => onPlaybackSpeedChange(speed)}
                      disabled={missionEnded}
                      className={`rounded px-2 py-1.5 text-[9px] font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        playbackSpeed === speed
                          ? 'bg-cyan-200/15 text-cyan-100'
                          : 'text-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {speed}×
                    </button>
                  ))}
                </div>
                <span
                  aria-live="polite"
                  className={`text-[8px] font-bold tracking-[0.12em] ${
                    isPlaybackRunning ? 'text-emerald-200' : 'text-slate-500'
                  }`}
                >
                  {isPlaybackRunning
                    ? `RUNNING · ${playbackSpeed}×`
                    : missionEnded
                      ? 'COMPLETE'
                      : playbackPauseReason
                        ? 'PAUSED'
                        : 'READY'}
                </span>
              </div>
              <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 text-[9px] text-slate-400">
                <span>Pause at events and observation changes</span>
                <input
                  type="checkbox"
                  checked={autoPauseOnTransitions}
                  onChange={(event) => onAutoPauseChange(event.target.checked)}
                  className="accent-cyan-300"
                />
              </label>
              {playbackPauseReason && !isPlaybackRunning && (
                <p
                  role="status"
                  className="mt-2 text-[9px] leading-relaxed text-amber-100/75"
                >
                  {playbackPauseReason}
                </p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-1.5">
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
              {advancementErrors.length > 0 && (
                <div
                  role="alert"
                  className="mt-2 rounded-md border border-rose-300/15 bg-rose-400/5 px-2.5 py-2 text-[10px] text-rose-200"
                >
                  {advancementErrors.join(' ')}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-white/10 bg-[#061322]/85 p-3 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-4">
              <div className="mb-2 flex items-center gap-2">
                <Satellite size={13} className="text-cyan-200" />
                <p className="text-[9px] font-semibold tracking-[0.2em] text-slate-300">
                  SPACECRAFT SYSTEMS
                </p>
              </div>
              <dl className="space-y-1.5">
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
              <p className="mt-2 border-t border-white/10 pt-2 text-[9px] leading-relaxed text-slate-400">
                {instrumentNames.length > 0
                  ? instrumentNames.join(' · ')
                  : 'No instruments installed'}
              </p>
            </section>
          </div>
        </div>
      </section>

      {missionEnded && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200/15 bg-amber-200/[0.04] px-4 py-3 text-xs text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <p role="status">Mission window complete. Final engine state is preserved for debrief.</p>
          <button
            type="button"
            onClick={onOpenDebrief}
            className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-200"
          >
            Open mission debrief
          </button>
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <section
          aria-labelledby="mission-sequence-heading"
          className="rounded-xl border border-white/10 bg-[#09111e]/90 p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold tracking-[0.22em] text-cyan-200/70">
                FLIGHT PLAN
              </p>
              <h2
                id="mission-sequence-heading"
                className="mt-1 text-sm font-semibold tracking-wide text-white"
              >
                Observation sequence
              </h2>
            </div>
            <p className="text-[10px] text-slate-500">
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
  const accentColor = accent === 'cyan' ? 'text-cyan-200' : 'text-blue-200'
  const meterColor =
    accent === 'cyan' ? 'bg-cyan-300' : 'bg-blue-300'

  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-[#061322]/85 px-2.5 py-2.5 shadow-lg shadow-black/15 backdrop-blur-xl sm:px-3 sm:py-3">
      <div className="flex items-center gap-1.5">
        <span className={accentColor}>{icon}</span>
        <span className="truncate text-[8px] font-semibold tracking-[0.16em] text-slate-400 sm:text-[9px]">
          {label}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold tabular-nums text-white sm:text-base">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-slate-500">{detail}</p>
      {percentage !== undefined && (
        <div
          role="meter"
          aria-label={`${label} available`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentage)}
          className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${meterColor}`}
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
      className="min-w-0 rounded-md border border-cyan-200/15 bg-cyan-200/[0.06] px-1.5 py-2 text-[8px] font-bold tracking-[0.08em] text-cyan-100 transition-colors hover:border-cyan-200/30 hover:bg-cyan-200/10 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-slate-600 sm:px-2 sm:text-[9px]"
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
    <div className="flex min-w-0 items-center justify-between gap-2 text-[9px]">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="truncate text-right font-medium text-slate-200">
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
