import { useState } from 'react'
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import type { MissionEngineState } from '../../simulation/missionEngine'
import type { MissionObjectiveResult, MissionScoreResult } from '../../simulation/scoring'
import { calculateRemainingBattery, calculateRemainingStorage } from '../../simulation/calculations'

interface MissionDebriefProps {
  missionState: MissionEngineState
  objectives: MissionObjectiveResult[]
  score: MissionScoreResult
  onPlanAnotherMission: () => void
  onRedesignSpacecraft: () => void
  onReturnToMissionControl: () => void
  onReplayMission: () => string[]
}

function MissionDebrief({
  missionState,
  objectives,
  score,
  onPlanAnotherMission,
  onRedesignSpacecraft,
  onReturnToMissionControl,
  onReplayMission,
}: MissionDebriefProps) {
  const [replayErrors, setReplayErrors] = useState<string[]>([])
  const specifications = missionState.missionEventState.spacecraftSpecifications
  const completed = missionState.completedObservationIds.length
  const interrupted = missionState.interruptedObservations.length
  const rejected = missionState.schedule.rejectedObservations.length
  const unexecuted = Math.max(
    0,
    missionState.schedule.scheduledObservations.length - completed - interrupted,
  )
  const scienceValue = missionState.schedule.scheduledObservations
    .filter((observation) => missionState.completedObservationIds.includes(observation.observationId))
    .reduce((total, observation) => total + observation.scienceValue, 0)
  const remainingBattery = calculateRemainingBattery(
    specifications.batteryCapacity,
    missionState.actualEnergyConsumptionWh,
  )
  const remainingStorage = calculateRemainingStorage(
    specifications.storageCapacity,
    missionState.actualDataGeneratedMB,
  )
  const endingSolarGeneration = specifications.solarGeneration
  const scoreRows = [
    ['Scientific performance', score.categoryScores.scientificAchievement, 40],
    ['Objective completion', score.categoryScores.missionObjectives, 25],
    ['Resource efficiency', score.categoryScores.resourceEfficiency, 20],
    ['Operational execution', score.categoryScores.operationalExecution, 15],
  ] as const

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-5 md:p-10">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-cyan-300/15 bg-[#0b1728] p-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">MISSION DEBRIEF</p>
          <h1 className="mt-2 text-3xl font-bold">Mission window closed</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Results below are calculated from the final simulation state. Interrupted and rejected observations receive no science credit.
          </p>
        </div>
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-5 py-4 text-center">
          <p className="text-xs tracking-widest text-slate-400">FINAL SCORE</p>
          <p className="mt-1 text-4xl font-bold text-cyan-200">{score.totalScore}<span className="text-lg text-slate-400">/100</span></p>
          <p className="mt-1 text-sm font-semibold text-cyan-100">Grade {score.performanceGrade}</p>
        </div>
      </header>

      {!score.valid && (
        <div role="alert" className="rounded-xl border border-red-300/20 bg-red-400/5 p-4 text-sm text-red-200">
          Score validation failed: {score.errors.join(' ')}
        </div>
      )}
      {replayErrors.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-300/20 bg-red-400/5 p-4 text-sm text-red-200">
          Replay could not be initialized: {replayErrors.join(' ')}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Completed" value={completed} tone="text-emerald-300" />
        <Metric label="Interrupted" value={interrupted} tone="text-rose-300" />
        <Metric label="Rejected" value={rejected} tone="text-amber-200" />
        <Metric label="Unexecuted" value={unexecuted} tone="text-slate-300" />
        <Metric label="Science collected" value={scienceValue} tone="text-cyan-200" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
          <p className="text-xs font-semibold tracking-widest text-cyan-300">RESOURCE PERFORMANCE</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Stat label="Battery" value={`${remainingBattery} / ${specifications.batteryCapacity} Wh remaining`} />
            <Stat label="Energy consumed" value={`${missionState.actualEnergyConsumptionWh} Wh`} />
            <Stat label="Storage" value={`${remainingStorage} / ${specifications.storageCapacity} MB remaining`} />
            <Stat label="Data collected" value={`${missionState.actualDataGeneratedMB} MB`} />
            <Stat label="Solar generation" value={`${endingSolarGeneration} W available at close`} />
            <Stat label="Applied events" value={missionState.missionEventState.appliedEventIds.length} />
          </dl>
        </article>

        <article className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
          <p className="text-xs font-semibold tracking-widest text-cyan-300">SCORE BREAKDOWN</p>
          <div className="mt-4 space-y-4">
            {scoreRows.map(([label, value, maximum]) => (
              <div key={label}>
                <div className="flex justify-between text-sm"><span className="text-slate-400">{label}</span><span className="font-semibold">{value} / {maximum}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${maximum ? (value / maximum) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
          <p className="text-xs font-semibold tracking-widest text-cyan-300">SCIENTIFIC OBJECTIVES</p>
          <ul className="mt-4 space-y-3">
            {objectives.map((objective) => (
              <li key={objective.id} className="flex items-start gap-3 rounded-lg border border-white/10 p-3 text-sm">
                {objective.completed ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={18} /> : <XCircle className="mt-0.5 shrink-0 text-rose-300" size={18} />}
                <div><p className="font-medium">{objective.completed ? 'Completed' : 'Not completed'}</p><p className="mt-1 text-xs text-slate-400">{objective.description}</p></div>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
          <p className="text-xs font-semibold tracking-widest text-cyan-300">MISSION NOTES</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
            {score.explanations.map((explanation) => <li key={explanation}>{explanation}</li>)}
            {missionState.interruptedObservations.map((observation) => <li key={observation.observationId} className="text-rose-200">{observation.observationId}: {observation.reason}</li>)}
          </ul>
        </article>
      </section>

      <footer className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
        <button type="button" onClick={onReturnToMissionControl} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"><ArrowLeft size={16} /> Mission Control</button>
        <button type="button" onClick={onRedesignSpacecraft} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5">Redesign spacecraft</button>
        <button
          type="button"
          onClick={() => setReplayErrors(onReplayMission())}
          className="flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/5 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10"
        >
          Replay mission
        </button>
        <button type="button" onClick={onPlanAnotherMission} className="flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"><RotateCcw size={16} /> Plan another mission</button>
      </footer>
    </main>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-xl border border-white/10 bg-[#111b2b] p-4"><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p></div>
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-100">{value}</dd></div>
}

export default MissionDebrief
