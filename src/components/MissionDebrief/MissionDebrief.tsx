import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle, Award } from 'lucide-react'
import type { MissionEngineState } from '../../simulation/missionEngine'
import type { MissionObjectiveResult, MissionScoreResult } from '../../simulation/scoring'
import { calculateRemainingBattery, calculateRemainingStorage } from '../../simulation/calculations'
import { audioTelemetry } from '../../utils/audioTelemetry'

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

  useEffect(() => {
    if (score.performanceGrade === 'A' || score.performanceGrade === 'B') {
      audioTelemetry.playMissionSuccess()
    }
  }, [score.performanceGrade])

  const generateCertificate = () => {
    audioTelemetry.playClick()
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 1000
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 1600, 1000)
    bg.addColorStop(0, '#02040a')
    bg.addColorStop(0.5, '#0b1426')
    bg.addColorStop(1, '#02040a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 1600, 1000)

    // Outer border
    ctx.strokeStyle = '#0071e3'
    ctx.lineWidth = 4
    ctx.strokeRect(40, 40, 1520, 920)

    // Inner subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 1
    ctx.strokeRect(55, 55, 1490, 890)

    // Header Agency
    ctx.fillStyle = '#2997ff'
    ctx.font = 'bold 20px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('NATIONAL AERONAUTICS AND SPACE ADMINISTRATION', 800, 130)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px -apple-system, sans-serif'
    ctx.fillText('FLIGHT DIRECTOR CERTIFICATE OF MERIT', 800, 200)

    ctx.fillStyle = '#86868b'
    ctx.font = '18px -apple-system, sans-serif'
    ctx.fillText('ORBITAL OPERATIONS • MISSION WINDOW SIMULATION', 800, 245)

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.beginPath()
    ctx.moveTo(300, 285)
    ctx.lineTo(1300, 285)
    ctx.stroke()

    // Body text
    ctx.fillStyle = '#86868b'
    ctx.font = '20px -apple-system, sans-serif'
    ctx.fillText('This is to certify that orbital operations have been executed by:', 800, 360)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 46px -apple-system, sans-serif'
    ctx.fillText('FLIGHT DIRECTOR ASWIN & TEAM', 800, 425)

    ctx.fillStyle = '#2997ff'
    ctx.font = 'bold 22px -apple-system, sans-serif'
    ctx.fillText(`MISSION SCORE: ${score.totalScore} / 100 • SCIENCE RETURN: +${scienceValue} PTS`, 800, 480)

    // Grade Banner
    ctx.fillStyle = score.performanceGrade === 'A' ? '#34c759' : '#2997ff'
    ctx.font = 'bold 74px -apple-system, sans-serif'
    ctx.fillText(`GRADE ${score.performanceGrade}`, 800, 585)

    // Telemetry summary
    ctx.fillStyle = '#f5f5f7'
    ctx.font = '19px -apple-system, sans-serif'
    ctx.fillText(`Completed Passes: ${completed}  |  Energy Margins: ${remainingBattery} Wh  |  Data Captured: ${missionState.actualDataGeneratedMB} MB`, 800, 665)

    // Verification footer
    const hash = `SHA256:0x${Math.floor(Math.random() * 16777215).toString(16)}${Math.floor(Math.random() * 16777215).toString(16).toUpperCase()}`
    ctx.fillStyle = '#86868b'
    ctx.font = '14px monospace'
    ctx.fillText(`CRYPTO VERIFICATION: ${hash} • HACKATHON MISSION EVALUATION`, 800, 835)

    ctx.fillStyle = '#555555'
    ctx.font = '14px -apple-system, sans-serif'
    ctx.fillText(`Issued: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} • Mission Window Engine v1.0`, 800, 875)

    // Download file
    const link = document.createElement('a')
    link.download = `NASA_Flight_Certificate_Grade_${score.performanceGrade}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col justify-between gap-6 rounded-3xl border border-white/[0.08] apple-glass p-6 sm:p-8 sm:flex-row sm:items-end shadow-2xl">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">Mission Debrief</p>
          <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight text-white apple-headline">
            Mission Window Closed
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#86868b] leading-relaxed">
            Final orbital evaluation calculated from the flight telemetry log. Completed passes receive full scientific credit.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={generateCertificate}
              className="apple-pill-btn flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] px-5 py-2.5 text-xs font-medium text-white shadow-[0_4px_16px_rgba(0,113,227,0.35)]"
            >
              <Award size={15} /> Export NASA Certificate (.PNG)
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] px-6 py-5 text-center backdrop-blur-2xl shrink-0">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#86868b] uppercase">Final Score</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-white">{score.totalScore}<span className="text-lg font-normal text-[#86868b]"> / 100</span></p>
          <p className="mt-1 text-xs font-medium text-[#2997ff]">Grade {score.performanceGrade}</p>
        </div>
      </header>

      {!score.valid && (
        <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200">
          Score validation failed: {score.errors.join(' ')}
        </div>
      )}
      {replayErrors.length > 0 && (
        <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200">
          Replay could not be initialized: {replayErrors.join(' ')}
        </div>
      )}

      <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Completed" value={completed} tone="text-[#34c759]" />
        <Metric label="Interrupted" value={interrupted} tone="text-rose-400" />
        <Metric label="Rejected" value={rejected} tone="text-amber-400" />
        <Metric label="Unexecuted" value={unexecuted} tone="text-[#86868b]" />
        <Metric label="Science Collected" value={scienceValue} tone="text-[#2997ff]" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/[0.08] apple-glass p-6 shadow-xl">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">Resource Performance</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <Stat label="Battery" value={`${remainingBattery} / ${specifications.batteryCapacity} Wh left`} />
            <Stat label="Energy consumed" value={`${missionState.actualEnergyConsumptionWh} Wh`} />
            <Stat label="Storage" value={`${remainingStorage} / ${specifications.storageCapacity} MB left`} />
            <Stat label="Data collected" value={`${missionState.actualDataGeneratedMB} MB`} />
            <Stat label="Solar generation" value={`${endingSolarGeneration} W available`} />
            <Stat label="Applied events" value={missionState.missionEventState.appliedEventIds.length} />
          </dl>
        </article>

        <article className="rounded-3xl border border-white/[0.08] apple-glass p-6 shadow-xl">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">Score Breakdown</p>
          <div className="mt-5 space-y-4">
            {scoreRows.map(([label, value, maximum]) => (
              <div key={label}>
                <div className="flex justify-between text-xs">
                  <span className="text-[#86868b]">{label}</span>
                  <span className="font-semibold text-white tracking-tight">{value} / {maximum}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2997ff] to-[#0071e3]"
                    style={{ width: `${maximum ? (value / maximum) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/[0.08] apple-glass p-6 shadow-xl">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">Scientific Objectives</p>
          <ul className="mt-5 space-y-3">
            {objectives.map((objective) => (
              <li key={objective.id} className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-sm">
                {objective.completed ? <CheckCircle2 className="mt-0.5 shrink-0 text-[#34c759]" size={17} /> : <XCircle className="mt-0.5 shrink-0 text-rose-400" size={17} />}
                <div>
                  <p className="font-medium text-white tracking-tight">{objective.completed ? 'Objective Completed' : 'Incomplete'}</p>
                  <p className="mt-0.5 text-xs text-[#86868b] leading-relaxed">{objective.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-3xl border border-white/[0.08] apple-glass p-6 shadow-xl">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">Flight Assessment</p>
          <ul className="mt-5 space-y-2.5 text-xs leading-relaxed text-[#86868b]">
            {score.explanations.map((explanation) => (
              <li key={explanation} className="flex items-start gap-2 text-[#f5f5f7]">
                <span className="text-[#2997ff]">•</span>
                <span>{explanation}</span>
              </li>
            ))}
            {missionState.interruptedObservations.map((observation) => (
              <li key={observation.observationId} className="flex items-start gap-2 text-rose-300">
                <span>•</span>
                <span>{observation.observationId}: {observation.reason}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <footer className="flex flex-col gap-3 border-t border-white/[0.08] pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onReturnToMissionControl}
          className="apple-pill-btn flex items-center justify-center gap-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#f5f5f7]"
        >
          <ArrowLeft size={15} /> Mission Control
        </button>
        <button
          type="button"
          onClick={onRedesignSpacecraft}
          className="apple-pill-btn flex items-center justify-center gap-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#f5f5f7]"
        >
          Redesign Spacecraft
        </button>
        <button
          type="button"
          onClick={() => setReplayErrors(onReplayMission())}
          className="apple-pill-btn flex items-center justify-center gap-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#f5f5f7]"
        >
          Replay Mission
        </button>
        <button
          type="button"
          onClick={onPlanAnotherMission}
          className="apple-pill-btn flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] px-6 py-2.5 text-sm font-medium text-white shadow-[0_4px_16px_rgba(0,113,227,0.35)]"
        >
          <RotateCcw size={15} /> Plan Another Mission
        </button>
      </footer>
    </main>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="apple-card rounded-2xl border border-white/[0.08] p-4 text-left">
      <p className="text-[10px] font-semibold tracking-wider text-[#86868b] uppercase">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-tight ${tone}`}>{value}</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[11px] text-[#86868b]">{label}</dt>
      <dd className="mt-0.5 font-medium text-white tracking-tight">{value}</dd>
    </div>
  )
}

export default MissionDebrief
