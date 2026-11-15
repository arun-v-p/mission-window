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
} from 'lucide-react'
import { instruments } from '../../data/spacecraftOptions'
import { observationCatalogue } from '../../data/missionCatalogue'
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

  const launchMission = () => {
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
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-cyan-400">
            MISSION PLANNING / OBSERVATION ORDER
          </p>
          <h1 className="text-3xl font-bold md:text-4xl">
            Manual Observation Planner
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Select opportunities and arrange their execution order. The
            scheduler evaluates your order without changing it.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5"
        >
          <ArrowLeft size={16} />
          Back to spacecraft
        </button>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Observation catalogue</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Mission window: {DEFAULT_MISSION_WINDOW_DURATION_MINUTES}{' '}
                  minutes
                </p>
              </div>
              <span className="text-xs text-slate-500">
                {selectedObservationIds.length} selected
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {observationCatalogue.map((observation) => {
                const isSelected = selectedIds.has(observation.id)
                const instrumentName =
                  instrumentNames.get(observation.instrumentId) ??
                  observation.instrumentId

                return (
                  <article
                    key={observation.id}
                    className="flex h-full flex-col rounded-xl border border-white/10 bg-[#111b2b] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{observation.name}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {observation.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md border border-violet-300/15 bg-violet-300/5 px-2 py-1 text-[10px] text-violet-200">
                        {instrumentName}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                      <span>{observation.durationMinutes} min duration</span>
                      <span>
                        Window {observation.opportunityOpensAtMinute}–
                        {observation.opportunityClosesAtMinute} min
                      </span>
                      <span>{observation.scienceValue} science</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => addObservation(observation.id)}
                      disabled={isSelected}
                      className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/10 disabled:cursor-default disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                    >
                      <Plus size={14} />
                      {isSelected ? 'Added to plan' : 'Add observation'}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Your observation order</h2>
              <p className="mt-1 text-xs text-slate-500">
                Move observations to change the order evaluated by the
                scheduler.
              </p>
            </div>

            {selectedObservationIds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
                Add observations from the catalogue to build your plan.
              </div>
            ) : (
              <ol className="space-y-2">
                {selectedObservationIds.map((observationId, index) => {
                  const observation = observationsById.get(observationId)
                  if (!observation) return null

                  return (
                    <li
                      key={observationId}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111b2b] p-3 sm:p-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {observation.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {instrumentNames.get(observation.instrumentId) ??
                            observation.instrumentId}
                          {' · '}
                          {observation.durationMinutes} min
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Move up ${observation.name}`}
                          onClick={() => moveObservation(index, -1)}
                          disabled={index === 0}
                          className="rounded-md border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move down ${observation.name}`}
                          onClick={() => moveObservation(index, 1)}
                          disabled={index === selectedObservationIds.length - 1}
                          className="rounded-md border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${observation.name}`}
                          onClick={() => removeObservation(observationId)}
                          className="rounded-md border border-red-300/15 p-2 text-red-300 transition hover:bg-red-400/10"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-5 rounded-xl border border-white/10 bg-[#111b2b] p-5 xl:sticky xl:top-6">
          <div>
            <p className="text-xs tracking-widest text-cyan-400">
              SCHEDULE RESULTS
            </p>
            <h2 className="mt-2 text-xl font-bold">{scheduleStatus}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <div className="flex items-center justify-between border-y border-white/10 py-4">
            <span className="text-sm text-slate-400">Scheduled science</span>
            <span className="text-lg font-semibold text-slate-100">
              {schedule.totalScienceValue}
            </span>
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Execution order</h3>
            {schedule.scheduledObservations.length === 0 ? (
              <p className="text-xs text-slate-500">
                No observations are currently scheduled.
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
                        className="rounded-lg border border-emerald-300/10 bg-emerald-300/[0.03] p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-emerald-300">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="text-xs font-medium text-slate-200">
                              {observation?.name ??
                                scheduledObservation.observationId}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {scheduledObservation.startMinute}–
                              {scheduledObservation.endMinute} min
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
            <section className="space-y-3 border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-amber-200">
                Rejected observations
              </h3>
              <ul className="space-y-2">
                {schedule.rejectedObservations.map((rejectedObservation) => (
                  <li
                    key={rejectedObservation.observationId}
                    className="rounded-lg border border-amber-300/10 bg-amber-300/[0.03] p-3"
                  >
                    <p className="text-xs font-medium text-slate-200">
                      {observationsById.get(rejectedObservation.observationId)
                        ?.name ?? rejectedObservation.observationId}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-100/70">
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
              className="space-y-2 border-t border-white/10 pt-4 text-xs text-red-300"
            >
              {schedule.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          {launchErrors.length > 0 && (
            <ul
              role="alert"
              className="space-y-2 border-t border-white/10 pt-4 text-xs text-red-300"
            >
              {launchErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={launchMission}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            <Rocket size={17} />
            Launch Mission
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
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-cyan-300">
        {icon}
        <span className="text-[10px] text-slate-400">{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  )
}

export default MissionPlanner
