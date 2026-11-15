import type { ReactNode } from 'react'
import {
  Activity,
  BatteryCharging,
  Clock3,
  Database,
  Satellite,
  Shield,
} from 'lucide-react'

function MissionHUD() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-cyan-200/15 bg-[#06101dcc] px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-md">
            <span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300">
              <Satellite size={20} />
            </span>
            <div>
              <p className="text-sm font-bold tracking-[0.12em] text-slate-100">
                MISSION WINDOW
              </p>
              <p className="text-[9px] tracking-[0.22em] text-slate-400">
                ORBITAL OPERATIONS
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#06101dcc] px-3 py-2 backdrop-blur-md sm:px-4 sm:py-3">
            <p className="text-[9px] font-semibold tracking-[0.18em] text-slate-500">
              MISSION STATUS
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-200 sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Standby preview
            </div>
            <p className="mt-1 text-[9px] text-slate-500">VISUAL PLACEHOLDER</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#06101dcc] px-3 py-3 text-right backdrop-blur-md sm:px-4">
          <div className="flex items-center justify-end gap-2 text-cyan-300">
            <Clock3 size={15} />
            <span className="text-[9px] font-semibold tracking-[0.16em]">
              MISSION ELAPSED
            </span>
          </div>
          <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-slate-100 sm:text-xl">
            --:--:--
          </p>
          <p className="text-[9px] text-slate-500">VISUAL PLACEHOLDER</p>
        </div>
      </header>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <ResourceIndicator
            icon={<BatteryCharging size={16} />}
            label="BATTERY"
            value="72%"
            detail="VISUAL PLACEHOLDER"
            fill="72%"
          />
          <ResourceIndicator
            icon={<Database size={16} />}
            label="DATA STORAGE"
            value="38%"
            detail="VISUAL PLACEHOLDER"
            fill="38%"
          />
        </div>

        <div className="w-44 rounded-xl border border-cyan-200/15 bg-[#06101dcc] p-3 backdrop-blur-md sm:w-56 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
              <Shield size={15} className="text-cyan-300" />
              <span className="text-[10px] font-semibold tracking-wider">
                SPACECRAFT
              </span>
            </div>
            <Activity size={14} className="text-cyan-300" />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            MW-01 Explorer
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
            STATUS: VISUAL PLACEHOLDER
            <br />
            NOT CONNECTED TO SIMULATION
          </p>
        </div>
      </div>

    </div>
  )
}

function ResourceIndicator({
  icon,
  label,
  value,
  detail,
  fill,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  fill: string
}) {
  return (
    <div className="w-36 rounded-xl border border-white/10 bg-[#06101dcc] p-3 backdrop-blur-md sm:w-40 sm:p-4">
      <div className="flex items-center justify-between gap-2 text-cyan-300">
        <span className="flex items-center gap-2 text-[9px] font-semibold tracking-wider">
          {icon}
          {label}
        </span>
        <span className="text-xs font-semibold text-slate-100">{value}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300"
          style={{ width: fill }}
        />
      </div>
      <p className="mt-2 text-[8px] tracking-[0.08em] text-slate-500">{detail}</p>
    </div>
  )
}

export default MissionHUD
