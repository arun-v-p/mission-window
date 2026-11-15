
import { useState } from 'react'
import {
  Activity,
  BatteryCharging,
  Radio,
  Satellite,
  Signal,
  Clock3,
  Zap,
  Database,
  ArrowUpRight,
  Check,
  Play,
  Orbit,
  Target,
  ShieldCheck,
} from 'lucide-react'

const observations = [
  {
    id: 'flood',
    name: 'Coastal Flood Mapping',
    category: 'EARTH OBSERVATION',
    duration: 4,
    energy: 3,
    storage: 200,
    science: 95,
    color: 'cyan',
  },
  {
    id: 'forest',
    name: 'Forest Monitoring',
    category: 'LAND COVER',
    duration: 3,
    energy: 2,
    storage: 100,
    science: 65,
    color: 'emerald',
  },
  {
    id: 'atmosphere',
    name: 'Atmospheric Study',
    category: 'CLIMATE SCIENCE',
    duration: 5,
    energy: 5,
    storage: 350,
    science: 90,
    color: 'violet',
  },
  {
    id: 'coastal',
    name: 'Coastal Erosion',
    category: 'GEOSCIENCE',
    duration: 3,
    energy: 2,
    storage: 150,
    science: 80,
    color: 'amber',
  },
]

function App() {
  const [selected, setSelected] = useState<string[]>([])
  const [started, setStarted] = useState(false)

  const selectedObservations = observations.filter((item) =>
    selected.includes(item.id),
  )

  const totalTime = selectedObservations.reduce(
    (sum, item) => sum + item.duration,
    0,
  )

  const totalEnergy = selectedObservations.reduce(
    (sum, item) => sum + item.energy,
    0,
  )

  const totalStorage = selectedObservations.reduce(
    (sum, item) => sum + item.storage,
    0,
  )

  const totalScience = selectedObservations.reduce(
    (sum, item) => sum + item.science,
    0,
  )

  const toggleObservation = (id: string) => {
    setStarted(false)
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    )
  }

  const resources = [
    {
      label: 'Battery charge',
      value: 72,
      unit: '%',
      icon: BatteryCharging,
      color: 'bg-emerald-400',
      detail: 'Healthy',
    },
    {
      label: 'Available power',
      value: 120,
      unit: 'W',
      icon: Zap,
      color: 'bg-cyan-400',
      detail: 'Nominal',
    },
    {
      label: 'Data storage',
      value: 80,
      unit: '%',
      icon: Database,
      color: 'bg-violet-400',
      detail: 'Capacity used',
    },
  ]

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      {/* Navigation */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-[#0b1220] lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
            <Satellite size={23} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">MISSION WINDOW</h1>
            <p className="text-[10px] tracking-[0.25em] text-slate-500">
              SPACE OPERATIONS
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          <p className="mb-4 px-3 text-[10px] font-semibold tracking-[0.2em] text-slate-500">
            MISSION CONTROL
          </p>

          <div className="flex items-center gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-300">
            <Activity size={18} />
            Mission overview
          </div>

          <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400">
            <Satellite size={18} />
            Spacecraft
          </div>

          <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400">
            <Target size={18} />
            Observations
          </div>

          <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400">
            <Radio size={18} />
            Communications
          </div>
        </nav>

        <div className="m-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            SYSTEMS ONLINE
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Mission Window Simulator v1.0
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen lg:ml-64">
        <header className="flex h-20 items-center justify-between border-b border-white/10 px-5 md:px-10">
          <div>
            <p className="text-xs tracking-widest text-slate-500">
              MISSION / EARTH OBSERVATION
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Mission Control Center
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-400 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              ALL SYSTEMS NOMINAL
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
              <Orbit size={19} />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-8 p-5 md:p-10">
          {/* Mission heading */}
          <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-cyan-400">
                <Orbit size={15} />
                ACTIVE MISSION
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Earth Observation Mission
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Design your observation strategy. Every minute matters.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Clock3 className="text-cyan-400" size={22} />
              <div>
                <p className="text-[10px] tracking-widest text-slate-500">
                  OBSERVATION WINDOW
                </p>
                <p className="font-mono text-xl font-semibold">12:00 MIN</p>
              </div>
            </div>
          </section>

          {/* Mission status */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
              <div className="flex justify-between">
                <Satellite className="text-cyan-400" size={21} />
                <span className="text-[10px] text-emerald-400">NOMINAL</span>
              </div>
              <p className="mt-5 text-xs text-slate-500">SPACECRAFT</p>
              <p className="mt-1 text-lg font-semibold">MW-01 Explorer</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
              <Target className="text-violet-400" size={21} />
              <p className="mt-5 text-xs text-slate-500">MISSION TARGET</p>
              <p className="mt-1 text-lg font-semibold">Earth Orbit</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
              <Radio className="text-amber-400" size={21} />
              <p className="mt-5 text-xs text-slate-500">COMMUNICATION</p>
              <p className="mt-1 text-lg font-semibold">Connected</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
              <ShieldCheck className="text-emerald-400" size={21} />
              <p className="mt-5 text-xs text-slate-500">MISSION STATUS</p>
              <p className="mt-1 text-lg font-semibold">Pre-launch</p>
            </div>
          </section>

          {/* Resources */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Spacecraft Resources</h3>
              <span className="text-xs text-slate-500">LIVE MONITORING</span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {resources.map((resource) => (
                <div
                  key={resource.label}
                  className="rounded-xl border border-white/10 bg-[#111b2b] p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      {resource.label}
                    </span>
                    <resource.icon size={19} className="text-cyan-400" />
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-3xl font-semibold">
                      {resource.value}
                      <span className="ml-1 text-sm text-slate-500">
                        {resource.unit}
                      </span>
                    </span>
                    <span className="mb-1 text-xs text-emerald-400">
                      {resource.detail}
                    </span>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${resource.color}`}
                      style={{
                        width: `${resource.unit === 'W' ? 100 : resource.value}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Observation planner */}
          <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Scientific Opportunities</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Select the observations you want to perform.
                  </p>
                </div>
                <span className="text-xs text-cyan-400">
                  {selected.length} SELECTED
                </span>
              </div>

              <div className="space-y-3">
                {observations.map((item) => {
                  const isSelected = selected.includes(item.id)

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleObservation(item.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-cyan-400/50 bg-cyan-400/[0.07]'
                          : 'border-white/10 bg-[#111b2b] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest text-cyan-400">
                            {item.category}
                          </p>
                          <h4 className="mt-2 font-semibold">{item.name}</h4>
                        </div>

                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                              : 'border-white/20 text-transparent'
                          }`}
                        >
                          <Check size={16} />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                        <span>{item.duration} min</span>
                        <span>{item.energy} Wh</span>
                        <span>{item.storage} MB</span>
                        <span className="text-emerald-400">
                          Science value: {item.science}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Planning summary */}
            <div className="h-fit rounded-xl border border-white/10 bg-[#111b2b] p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Mission Plan</h3>
                <Activity className="text-cyan-400" size={19} />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Resource allocation summary
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Observation time</span>
                    <span className="font-semibold">{totalTime}/12 min</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        totalTime > 12 ? 'bg-red-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${Math.min(totalTime / 12 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Energy allocated</span>
                    <span className="font-semibold">{totalEnergy} Wh</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${Math.min(totalEnergy / 12 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Data generated</span>
                    <span className="font-semibold">{totalStorage} MB</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-violet-400"
                      style={{ width: `${Math.min(totalStorage / 1000 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-slate-500">TOTAL SCIENCE VALUE</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-400">
                    {totalScience}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Combined observation value
                  </p>
                </div>

                {started && (
                  <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-300">
                    Mission plan prepared. Simulation engine integration is
                    the next development step.
                  </div>
                )}

                <button
                  onClick={() => setStarted(true)}
                  disabled={
                    selected.length === 0 ||
                    totalTime > 12 ||
                    totalEnergy > 12 ||
                    totalStorage > 1000
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Play size={17} />
                  Prepare Mission
                  <ArrowUpRight size={16} />
                </button>

                <p className="text-center text-[10px] text-slate-500">
                  Select observations to prepare your mission.
                </p>
              </div>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 border-t border-white/10 py-5 text-xs text-slate-500 sm:flex-row">
            <span>MISSION WINDOW · SPACE MISSION DESIGN GAME</span>
            <span className="flex items-center gap-2">
              <Signal size={13} />
              SIMULATION ENVIRONMENT · DEMO DATA
            </span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
