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
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/[0.1] bg-[#161617]/75 px-4 py-2.5 shadow-xl shadow-black/40 backdrop-blur-2xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0071e3]/15 text-[#2997ff] border border-[#0071e3]/20">
              <Satellite size={17} />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-tight text-white">
                MISSION WINDOW
              </p>
              <p className="text-[9px] tracking-[0.2em] text-[#86868b] font-medium">
                ORBITAL OPERATIONS
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#161617]/75 px-3.5 py-2.5 backdrop-blur-2xl shadow-lg">
            <p className="text-[9px] font-semibold tracking-[0.2em] text-[#86868b] uppercase">
              Mission Status
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-white">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34c759] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34c759]"></span>
              </span>
              Standby Orbit Preview
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#161617]/75 px-4 py-2.5 text-right backdrop-blur-2xl shadow-lg">
          <div className="flex items-center justify-end gap-1.5 text-[#2997ff]">
            <Clock3 size={13} />
            <span className="text-[9px] font-semibold tracking-[0.16em] uppercase">
              Mission MET
            </span>
          </div>
          <p className="mt-0.5 font-mono text-base font-semibold tracking-wider text-white">
            00:00:00
          </p>
          <p className="text-[9px] text-[#86868b]">PRE-LAUNCH</p>
        </div>
      </header>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <ResourceIndicator
            icon={<BatteryCharging size={14} />}
            label="BATTERY"
            value="100%"
            detail="SOLAR ARRAY ACTIVE"
            fill="100%"
          />
          <ResourceIndicator
            icon={<Database size={14} />}
            label="STORAGE"
            value="0%"
            detail="MEMORY NOMINAL"
            fill="12%"
          />
        </div>

        <div className="w-48 rounded-2xl border border-white/[0.08] bg-[#161617]/75 p-3.5 backdrop-blur-2xl shadow-lg sm:w-56">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Shield size={14} className="text-[#2997ff]" />
              <span className="text-[10px] font-semibold tracking-wider uppercase">
                Spacecraft
              </span>
            </div>
            <Activity size={13} className="text-[#34c759]" />
          </div>
          <p className="mt-1.5 text-sm font-semibold tracking-tight text-white">
            MW-01 Explorer
          </p>
          <p className="mt-0.5 text-[10px] text-[#86868b]">
            Telemetry: Nominal Orbit
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
    <div className="w-36 rounded-2xl border border-white/[0.08] bg-[#161617]/75 p-3 backdrop-blur-2xl shadow-lg sm:w-40 sm:p-3.5">
      <div className="flex items-center justify-between gap-2 text-[#2997ff]">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold tracking-wider">
          {icon}
          {label}
        </span>
        <span className="text-xs font-semibold text-white">{value}</span>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2997ff] to-[#0071e3]"
          style={{ width: fill }}
        />
      </div>
      <p className="mt-2 text-[8px] tracking-[0.1em] text-[#86868b] uppercase">{detail}</p>
    </div>
  )
}

export default MissionHUD
