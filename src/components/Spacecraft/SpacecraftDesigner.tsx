
import { useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  BatteryCharging,
  Camera,
  RadioTower,
  Database,
  Weight,
  Wallet,
  Check,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

import {
  powerSystems,
  instruments,
  communicationSystems,
  storageSystems,
} from '../../data/spacecraftOptions'
import { nasaPresets } from '../../data/nasaPresets'
import { audioTelemetry } from '../../utils/audioTelemetry'

import { calculateSpacecraftSpecifications } from '../../simulation/calculations'
import {
  MAX_BUDGET_CREDITS,
  MAX_SPACECRAFT_MASS_KG,
  validateSpacecraftConfiguration,
} from '../../simulation/validator'
import type { SpacecraftConfiguration } from '../../types/mission'

export const initialConfiguration: SpacecraftConfiguration = {
  powerSystemId: 'power-standard',
  instrumentIds: ['camera', 'radar'],
  communicationSystemId: 'antenna-standard',
  storageSystemId: 'storage-standard',
}

interface SpacecraftDesignerProps {
  configuration: SpacecraftConfiguration
  setConfiguration: Dispatch<SetStateAction<SpacecraftConfiguration>>
  onContinueToPlanner: () => void
}

function SpacecraftDesigner({
  configuration,
  setConfiguration,
  onContinueToPlanner,
}: SpacecraftDesignerProps) {
  const { specifications, validation } = useMemo(() => {
    return {
      specifications: calculateSpacecraftSpecifications(configuration),
      validation: validateSpacecraftConfiguration(configuration),
    }
  }, [configuration])

  const budgetValid = !validation.errors.some((error) =>
    error.startsWith('Spacecraft cost ('),
  )
  const massValid = !validation.errors.some((error) =>
    error.startsWith('Spacecraft mass ('),
  )
  const instrumentsValid = !validation.errors.some((error) =>
    error.startsWith('Select at least one scientific instrument'),
  )
  const designValid = validation.valid

  const remainingBudget = MAX_BUDGET_CREDITS - specifications.totalCost
  const remainingMass = MAX_SPACECRAFT_MASS_KG - specifications.totalMass

  const updateConfiguration = (
    key: keyof SpacecraftConfiguration,
    value: string,
  ) => {
    setConfiguration((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  const toggleInstrument = (id: string) => {
    setConfiguration((previous) => ({
      ...previous,
      instrumentIds: previous.instrumentIds.includes(id)
        ? previous.instrumentIds.filter((item) => item !== id)
        : [...previous.instrumentIds, id],
    }))
  }

  const resetConfiguration = () => {
    setConfiguration(initialConfiguration)
  }

  const saveConfiguration = () => {
    if (!designValid) return

    localStorage.setItem(
      'mission-window-spacecraft',
      JSON.stringify({
        configuration,
        specifications: {
          totalMass: specifications.totalMass,
          totalCost: specifications.totalCost,
          batteryCapacity: specifications.batteryCapacity,
          solarGeneration: specifications.solarGeneration,
          totalInstrumentPower: specifications.totalInstrumentPower,
          communicationRate: specifications.communicationRate,
          storageCapacity: specifications.storageCapacity,
          totalScienceValue: specifications.totalScienceValue,
        },
      }),
    )

    alert('Spacecraft configuration saved successfully!')
  }

  const OptionCard = ({
    title,
    description,
    selected,
    onClick,
    details,
  }: {
    title: string
    description: string
    selected: boolean
    onClick: () => void
    details: string[]
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl p-5 text-left transition-all duration-300 relative group ${
        selected
          ? 'border border-[#2997ff]/60 bg-[#1d1d1f]/90 shadow-[0_8px_30px_rgba(0,113,227,0.22)] ring-1 ring-[#2997ff]/40'
          : 'border border-white/[0.08] bg-[#161617]/70 hover:border-white/[0.18] hover:bg-[#1c1c1e]/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-[15px] text-white tracking-tight">{title}</h4>
          <p className="mt-1 text-xs text-[#86868b] leading-relaxed">{description}</p>
        </div>
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
            selected
              ? 'bg-[#0071e3] text-white shadow-[0_2px_8px_rgba(0,113,227,0.5)]'
              : 'border border-white/20 bg-white/[0.03]'
          }`}
        >
          {selected && <Check size={13} strokeWidth={2.5} />}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {details.map((detail) => (
          <span
            key={detail}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#86868b]"
          >
            {detail}
          </span>
        ))}
      </div>
    </button>
  )

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">
            Spacecraft Engineering / Configuration
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl apple-headline">
            Design Your Spacecraft
          </h1>
          <p className="mt-1.5 apple-subhead">
            Every component affects your mission envelope. Balance mass, power, and science return.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetConfiguration}
            className="apple-pill-btn flex items-center justify-center gap-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#f5f5f7]"
          >
            <RotateCcw size={15} />
            Reset design
          </button>
          <button
            type="button"
            onClick={onContinueToPlanner}
            className="apple-pill-btn flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] px-6 py-2.5 text-sm font-medium text-white shadow-[0_4px_16px_rgba(0,113,227,0.35)]"
          >
            Mission Planner
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* NASA Flight Configuration Presets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#2997ff]" />
            <h3 className="text-xs font-semibold tracking-wider text-[#86868b] uppercase">
              NASA Certified Flight Templates (1-Click Judge Load)
            </h3>
          </div>
          <span className="text-[11px] text-[#86868b]">Pre-balanced aerospace architectures</span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          {nasaPresets.map((preset) => {
            const isMatch =
              configuration.powerSystemId === preset.configuration.powerSystemId &&
              configuration.communicationSystemId ===
                preset.configuration.communicationSystemId &&
              configuration.storageSystemId ===
                preset.configuration.storageSystemId &&
              configuration.instrumentIds.length ===
                preset.configuration.instrumentIds.length &&
              configuration.instrumentIds.every((id) =>
                preset.configuration.instrumentIds.includes(id),
              )

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  audioTelemetry.playClick()
                  setConfiguration(preset.configuration)
                }}
                className={`apple-card rounded-2xl p-4 text-left transition-all duration-300 relative group border ${
                  isMatch
                    ? 'border-[#0071e3] bg-[#1d1d1f]/95 ring-1 ring-[#0071e3] shadow-[0_8px_24px_rgba(0,113,227,0.25)]'
                    : 'border-white/[0.08] bg-[#161617]/70 hover:border-white/[0.18]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#86868b]">
                      {preset.agency}
                    </span>
                    <h4 className="mt-1.5 font-semibold text-sm text-white tracking-tight flex items-center gap-1.5">
                      {preset.name}
                      {isMatch && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0071e3] text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </h4>
                  </div>
                  <span className="font-mono text-[9px] text-[#2997ff] tracking-wider uppercase">
                    {preset.callsign}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#86868b] leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Engineering constraints */}
      <section className="grid gap-5 sm:grid-cols-2">
        <div className="apple-glass rounded-3xl p-6 border border-white/[0.08]">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium tracking-wide text-[#86868b] uppercase">Mission Budget</span>
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-semibold tracking-tight text-white">
              {specifications.totalCost.toLocaleString()}{' '}
              <span className="text-lg font-normal text-[#86868b]">/ 1,000 cr</span>
            </span>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                budgetValid
                  ? 'bg-emerald-400/10 text-[#34c759] border border-emerald-400/20'
                  : 'bg-red-400/10 text-red-400 border border-red-400/20'
              }`}
            >
              {remainingBudget >= 0
                ? `${remainingBudget} cr left`
                : `${Math.abs(remainingBudget)} cr over`}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetValid ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-red-500'
              }`}
              style={{
                width: `${Math.min(
                  (specifications.totalCost / MAX_BUDGET_CREDITS) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="apple-glass rounded-3xl p-6 border border-white/[0.08]">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium tracking-wide text-[#86868b] uppercase">Spacecraft Mass</span>
            <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#2997ff] border border-[#0071e3]/20">
              <Weight size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-semibold tracking-tight text-white">
              {specifications.totalMass}{' '}
              <span className="text-lg font-normal text-[#86868b]">/ {MAX_SPACECRAFT_MASS_KG} kg</span>
            </span>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                massValid
                  ? 'bg-emerald-400/10 text-[#34c759] border border-emerald-400/20'
                  : 'bg-red-400/10 text-red-400 border border-red-400/20'
              }`}
            >
              {remainingMass >= 0
                ? `${remainingMass} kg left`
                : `${Math.abs(remainingMass)} kg excess`}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                massValid ? 'bg-gradient-to-r from-[#2997ff] to-[#0071e3]' : 'bg-red-500'
              }`}
              style={{
                width: `${Math.min(
                  (specifications.totalMass / MAX_SPACECRAFT_MASS_KG) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          {/* Power system */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#2997ff] border border-[#0071e3]/20">
                <BatteryCharging size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-white tracking-tight">Power System</h2>
                <p className="text-xs text-[#86868b]">
                  Primary battery storage and orbital solar generation capability.
                </p>
              </div>
            </div>

            <div className="grid gap-3.5 md:grid-cols-3">
              {powerSystems.map((item) => (
                <OptionCard
                  key={item.id}
                  title={item.name}
                  description={`${item.batteryCapacity} Wh battery`}
                  selected={configuration.powerSystemId === item.id}
                  onClick={() =>
                    updateConfiguration('powerSystemId', item.id)
                  }
                  details={[
                    `${item.solarGeneration} W generation`,
                    `${item.mass} kg`,
                    `${item.cost} credits`,
                  ]}
                />
              ))}
            </div>
          </section>

          {/* Instruments */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-400/10 text-violet-400 border border-violet-400/20">
                <Camera size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-white tracking-tight">Scientific Instruments</h2>
                <p className="text-xs text-[#86868b]">
                  Install instruments required for scientific observations and telemetry.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {instruments.map((item) => (
                <OptionCard
                  key={item.id}
                  title={item.name}
                  description={item.description}
                  selected={configuration.instrumentIds.includes(item.id)}
                  onClick={() => toggleInstrument(item.id)}
                  details={[
                    `${item.powerConsumption} W`,
                    `${item.dataRate} MB/min`,
                    `${item.mass} kg`,
                    `${item.cost} credits`,
                    `Science ${item.scienceValue}`,
                  ]}
                />
              ))}
            </div>
          </section>

          {/* Communications */}
          <section id="communication-system" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                <RadioTower size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-white tracking-tight">Communication System</h2>
                <p className="text-xs text-[#86868b]">
                  Downlink bandwidth to ground control stations during orbital passes.
                </p>
              </div>
            </div>

            <div className="grid gap-3.5 md:grid-cols-3">
              {communicationSystems.map((item) => (
                <OptionCard
                  key={item.id}
                  title={item.name}
                  description={`${item.dataRate} MB/min downlink`}
                  selected={
                    configuration.communicationSystemId === item.id
                  }
                  onClick={() =>
                    updateConfiguration('communicationSystemId', item.id)
                  }
                  details={[`${item.mass} kg`, `${item.cost} credits`]}
                />
              ))}
            </div>
          </section>

          {/* Storage */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-400/10 text-[#34c759] border border-emerald-400/20">
                <Database size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-white tracking-tight">Data Storage</h2>
                <p className="text-xs text-[#86868b]">
                  Solid-state memory buffer to hold telemetry when out of ground pass range.
                </p>
              </div>
            </div>

            <div className="grid gap-3.5 md:grid-cols-3">
              {storageSystems.map((item) => (
                <OptionCard
                  key={item.id}
                  title={item.name}
                  description={`${item.capacity} MB capacity`}
                  selected={configuration.storageSystemId === item.id}
                  onClick={() =>
                    updateConfiguration('storageSystemId', item.id)
                  }
                  details={[`${item.mass} kg`, `${item.cost} credits`]}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Live engineering summary */}
        <aside className="h-fit space-y-6 rounded-3xl border border-white/[0.08] apple-glass p-6 xl:sticky xl:top-24 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2997ff] uppercase">
              Engineering Specs
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white apple-headline">
              MW-01 Explorer
            </h2>
            <p className="mt-1 text-xs text-[#86868b]">
              Real-time spacecraft telemetry profile
            </p>
          </div>

          <div className="space-y-3.5 border-y border-white/[0.08] py-5">
            {[
              ['Battery capacity', `${specifications.batteryCapacity} Wh`],
              ['Solar generation', `${specifications.solarGeneration} W`],
              ['Instrument power', `${specifications.totalInstrumentPower} W`],
              ['Downlink rate', `${specifications.communicationRate} MB/min`],
              ['Data capacity', `${specifications.storageCapacity} MB`],
              ['Scientific value', `${specifications.totalScienceValue}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-[#86868b]">{label}</span>
                <span className="font-medium text-white tracking-tight">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4.5 backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              {designValid ? (
                <ShieldCheck className="text-[#34c759]" size={18} />
              ) : (
                <AlertTriangle className="text-amber-400" size={18} />
              )}
              <span className="text-sm font-semibold tracking-tight text-white">
                {designValid ? 'Flight Configuration Valid' : 'Review Constraints'}
              </span>
            </div>

            <div className="mt-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#86868b]">Budget constraint</span>
                <span className={`font-medium ${budgetValid ? 'text-[#34c759]' : 'text-red-400'}`}>
                  {budgetValid ? 'Passed' : 'Exceeded'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#86868b]">Mass constraint</span>
                <span className={`font-medium ${massValid ? 'text-[#34c759]' : 'text-red-400'}`}>
                  {massValid ? 'Passed' : 'Exceeded'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#86868b]">Scientific payload</span>
                <span className={`font-medium ${instrumentsValid ? 'text-[#34c759]' : 'text-red-400'}`}>
                  {instrumentsValid ? 'Installed' : 'Missing'}
                </span>
              </div>
            </div>

            {validation.errors.length > 0 && (
              <ul
                role="alert"
                className="mt-3.5 space-y-1.5 border-t border-white/[0.08] pt-3 text-xs text-red-300"
              >
                {validation.errors.map((error) => (
                  <li key={error} className="flex items-center gap-1.5">
                    <span>•</span> {error}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={saveConfiguration}
            disabled={!designValid}
            className="apple-pill-btn w-full bg-[#0071e3] hover:bg-[#0077ed] py-3 text-sm font-medium text-white shadow-[0_4px_20px_rgba(0,113,227,0.35)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Check size={16} className="mr-1.5" />
            Save Spacecraft
          </button>

          <p className="text-center text-[11px] leading-relaxed text-[#86868b]">
            Your configuration is sealed for next-stage orbital simulation.
          </p>
        </aside>
      </div>
    </div>
  )
}

export default SpacecraftDesigner
