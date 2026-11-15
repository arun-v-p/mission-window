
import { Satellite, Activity, Target, Radio } from 'lucide-react'
import SpacecraftDesigner from './components/Spacecraft/SpacecraftDesigner'

function App() {
  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
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
          <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-400">
            <Activity size={18} />
            Mission overview
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-cyan-300">
            <Satellite size={18} />
            Spacecraft designer
          </div>
          <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-400">
            <Target size={18} />
            Observations
          </div>
          <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-400">
            <Radio size={18} />
            Communications
          </div>
        </nav>

        <div className="m-4 mt-auto rounded-xl border border-white/10 p-4">
          <p className="text-xs text-emerald-400">● SYSTEMS ONLINE</p>
          <p className="mt-2 text-xs text-slate-500">
            Mission Window Simulator v1.0
          </p>
        </div>
      </aside>

      <main className="lg:ml-64">
        <header className="flex h-20 items-center justify-between border-b border-white/10 px-5 md:px-10">
          <div>
            <p className="text-xs tracking-widest text-slate-500">
              MISSION / SPACECRAFT ENGINEERING
            </p>
            <h2 className="mt-1 font-semibold">Spacecraft Configuration</h2>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-400">
            ENGINEERING MODE
          </span>
        </header>

        <div className="mx-auto max-w-[1500px] p-5 md:p-10">
          <SpacecraftDesigner />
        </div>
      </main>
    </div>
  )
}

export default App
