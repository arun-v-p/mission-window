import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Clock3,
  Database,
  Plus,
  Rocket,
  Trash2,
  Zap,
  Sparkles,
} from 'lucide-react'
import { instruments } from '../../data/spacecraftOptions'
import { observationCatalogue } from '../../data/missionCatalogue'
import { audioTelemetry } from '../../utils/audioTelemetry'
import {
  DEFAULT_MISSION_WINDOW_DURATION_MINUTES,
  scheduleObservations,
  type ScheduleResult,
} from '../../simulation/scheduler'
import type { SpacecraftConfiguration } from '../../types/mission'

interface MissionPlannerProps {
  spacecraftConfiguration: SpacecraftConfiguration
  selectedObservationIds: string[]
  onSelectionChange: (observationIds: string[]) => void
  onBack: () => void
  onLaunch: (schedule: ScheduleResult) => string[]
}

function MissionPlanner({
  spacecraftConfiguration,
  selectedObservationIds,
  onSelectionChange,
  onBack,
  onLaunch,
}: MissionPlannerProps) {
  const [launchErrors, setLaunchErrors] = useState<string[]>([])
  const schedule = useMemo(
    () =>
      scheduleObservations(
        selectedObservationIds,
        observationCatalogue,
        spacecraftConfiguration,
      ),
    [selectedObservationIds, spacecraftConfiguration],
  )

  const instrumentNames = new Map(
    instruments.map((instrument) => [instrument.id, instrument.name]),
  )
  const observationsById = new Map(
    observationCatalogue.map((observation) => [observation.id, observation]),
  )
  const selectedIds = new Set(selectedObservationIds)

  const updateSelection = (observationIds: string[]) => {
    setLaunchErrors([])
    onSelectionChange(observationIds)
  }

  const addObservation = (observationId: string) => {
    if (selectedIds.has(observationId)) return
    updateSelection([...selectedObservationIds, observationId])
  }

  const removeObservation = (observationId: string) => {
    updateSelection(
      selectedObservationIds.filter((id) => id !== observationId),
    )
  }

  const moveObservation = (index: number, offset: -1 | 1) => {
    const targetIndex = index + offset
    if (targetIndex < 0 || targetIndex >= selectedObservationIds.length) return

    const reorderedIds = [...selectedObservationIds]
    const previousId = reorderedIds[index]
    reorderedIds[index] = reorderedIds[targetIndex]
    reorderedIds[targetIndex] = previousId
    updateSelection(reorderedIds)
  }

  const autoSelectRecommended = () => {
    audioTelemetry.playClick()
    const validObservations = observationCatalogue.filter((obs) =>
      spacecraftConfiguration.instrumentIds.includes(obs.instrumentId),
    )
    updateSelection(validObservations.map((obs) => obs.id))
  }

  const launchMission = () => {
    audioTelemetry.playClick()
    const errors = onLaunch(schedule)
    setLaunchErrors(errors)
  }

  const scheduleStatus = !schedule.valid
    ? 'Schedule needs attention'
    : schedule.rejectedObservations.length > 0
      ? 'Some observations were rejected'
      : selectedObservationIds.length > 0
        ? 'Schedule calculated'
        : 'No observations selected'

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">
            Mission Planning / Observation Timeline
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl apple-headline">
            Manual Observation Planner
          </h1>
          <p className="mt-1.5 apple-subhead max-w-2xl">
            Select opportunities and sequence their execution order. The orbital scheduler models real flight constraints.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="apple-pill-btn flex items-center justify-center gap-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#f5f5f7]"
        >
          <ArrowLeft size={15} />
          Back to spacecraft
        </button>
      </header>

      <section className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">Observation Catalogue</h2>
                <p className="mt-0.5 text-xs text-[#86868b]">
                  Orbital pass window: {DEFAULT_MISSION_WINDOW_DURATION_MINUTES} minutes
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={autoSelectRecommended}
                  className="apple-pill-btn flex items-center gap-1.5 rounded-full border border-[#0071e3]/30 bg-[#0071e3]/10 hover:bg-[#0071e3]/20 px-3 py-1 text-xs font-medium text-[#2997ff] transition"
                >
                  <Sparkles size={12} /> Auto-Queue Targets
                </button>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-[#86868b]">
                  {selectedObservationIds.length} queued
                </span>
              </div>
            </div>

            <div className="grid gap-3.5 lg:grid-cols-2">
              {observationCatalogue.map((observation) => {
                const isSelected = selectedIds.has(observation.id)
                const instrumentName =
                  instrumentNames.get(observation.instrumentId) ??
                  observation.instrumentId

                return (
                  <article
                    key={observation.id}
                    className="apple-card flex h-full flex-col rounded-2xl border border-white/[0.08] p-5 relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[15px] text-white tracking-tight">{observation.name}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-[#86868b]">
                          {observation.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#2997ff]/20 bg-[#0071e3]/10 px-3 py-1 text-[11px] font-medium text-[#2997ff]">
                        {instrumentName}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#86868b]">
                        {observation.durationMinutes} min duration
                      </span>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#86868b]">
                        Window {observation.opportunityOpensAtMinute}–{observation.opportunityClosesAtMinute} min
                      </span>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#86868b]">
                        Science +{observation.scienceValue}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => addObservation(observation.id)}
                      disabled={isSelected}
                      className={`apple-pill-btn mt-5 w-full py-2.5 text-xs font-medium ${
                        isSelected
                          ? 'border border-white/[0.08] bg-white/[0.04] text-[#86868b] cursor-default'
                          : 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-[0_2px_12px_rgba(0,113,227,0.3)]'
                      }`}
                    >
                      <Plus size={14} className="mr-1" />
                      {isSelected ? 'Added to Mission Plan' : 'Add Observation'}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Observation Execution Sequence</h2>
              <p className="mt-0.5 text-xs text-[#86868b]">
                Sequence your targets. Observations execute strictly in your designated order.
              </p>
            </div>

            {selectedObservationIds.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-8 text-center text-sm text-[#86868b]">
                Select scientific observations from the catalogue above to configure your flight plan.
              </div>
            ) : (
              <ol className="space-y-2.5">
                {selectedObservationIds.map((observationId, index) => {
                  const observation = observationsById.get(observationId)
                  if (!observation) return null

                  return (
                    <li
                      key={observationId}
                      className="apple-card flex items-center gap-3.5 rounded-2xl border border-white/[0.08] p-4"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0071e3]/15 text-[11px] font-semibold text-[#2997ff] border border-[#0071e3]/20">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white tracking-tight">
                          {observation.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#86868b]">
                          {instrumentNames.get(observation.instrumentId) ??
                            observation.instrumentId}
                          {' · '}
                          {observation.durationMinutes} min duration
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Move up ${observation.name}`}
                          onClick={() => moveObservation(index, -1)}
                          disabled={index === 0}
                          className="rounded-full border border-white/[0.1] bg-white/[0.04] p-2 text-white/80 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move down ${observation.name}`}
                          onClick={() => moveObservation(index, 1)}
                          disabled={index === selectedObservationIds.length - 1}
                          className="rounded-full border border-white/[0.1] bg-white/[0.04] p-2 text-white/80 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${observation.name}`}
                          onClick={() => removeObservation(observationId)}
                          className="rounded-full border border-red-400/20 bg-red-400/10 p-2 text-red-300 transition hover:bg-red-400/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-6 rounded-3xl border border-white/[0.08] apple-glass p-6 xl:sticky xl:top-24 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">
              Schedule Telemetry
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white apple-headline">{scheduleStatus}</h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <ScheduleMetric
              icon={<Clock3 size={15} />}
              label="Time used"
              value={`${schedule.totalDurationMinutes} min`}
            />
            <ScheduleMetric
              icon={<Clock3 size={15} />}
              label="Time remaining"
              value={`${schedule.remainingMissionTimeMinutes} min`}
            />
            <ScheduleMetric
              icon={<Zap size={15} />}
              label="Energy"
              value={`${schedule.totalEnergyConsumptionWh} Wh`}
            />
            <ScheduleMetric
              icon={<Database size={15} />}
              label="Data generated"
              value={`${schedule.totalDataGeneratedMB} MB`}
            />
          </div>

          <div className="flex items-center justify-between border-y border-white/[0.08] py-4">
            <span className="text-sm text-[#86868b]">Scheduled Science</span>
            <span className="text-xl font-semibold text-white tracking-tight">
              +{schedule.totalScienceValue} pts
            </span>
          </div>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-[#86868b] uppercase">Timeline Plan</h3>
            {schedule.scheduledObservations.length === 0 ? (
              <p className="text-xs text-[#86868b]">
                No observations are scheduled yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {schedule.scheduledObservations.map(
                  (scheduledObservation, index) => {
                    const observation = observationsById.get(
                      scheduledObservation.observationId,
                    )

                    return (
                      <li
                        key={scheduledObservation.observationId}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-xs font-semibold text-[#34c759]">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="text-xs font-medium text-white tracking-tight">
                              {observation?.name ??
                                scheduledObservation.observationId}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#86868b]">
                              T+{scheduledObservation.startMinute}–T+{scheduledObservation.endMinute} min
                            </p>
                          </div>
                        </div>
                      </li>
                    )
                  },
                )}
              </ol>
            )}
          </section>

          {schedule.rejectedObservations.length > 0 && (
            <section className="space-y-3 border-t border-white/[0.08] pt-4">
              <h3 className="text-xs font-semibold tracking-wide text-amber-400 uppercase">
                Rejected Observations
              </h3>
              <ul className="space-y-2">
                {schedule.rejectedObservations.map((rejectedObservation) => (
                  <li
                    key={rejectedObservation.observationId}
                    className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3"
                  >
                    <p className="text-xs font-medium text-white">
                      {observationsById.get(rejectedObservation.observationId)
                        ?.name ?? rejectedObservation.observationId}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">
                      {rejectedObservation.reason}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {schedule.errors.length > 0 && (
            <ul
              role="alert"
              className="space-y-1.5 border-t border-white/[0.08] pt-4 text-xs text-red-300"
            >
              {schedule.errors.map((error) => (
                <li key={error} className="flex items-center gap-1.5">
                  <span>•</span> {error}
                </li>
              ))}
            </ul>
          )}

          {launchErrors.length > 0 && (
            <ul
              role="alert"
              className="space-y-1.5 border-t border-white/[0.08] pt-4 text-xs text-red-300"
            >
              {launchErrors.map((error) => (
                <li key={error} className="flex items-center gap-1.5">
                  <span>•</span> {error}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={launchMission}
            className="apple-pill-btn w-full bg-[#0071e3] hover:bg-[#0077ed] py-3.5 text-sm font-medium text-white shadow-[0_4px_24px_rgba(0,113,227,0.4)]"
          >
            <Rocket size={16} className="mr-2" />
            Launch Mission Simulation
          </button>
        </aside>
      </section>
    </div>
  )
}

function ScheduleMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-2 text-[#2997ff]">
        {icon}
        <span className="text-[11px] text-[#86868b]">{label}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold tracking-tight text-white">{value}</p>
    </div>
  )
}

export default MissionPlanner
