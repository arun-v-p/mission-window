
import { useMemo, useState } from 'react'
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
} from 'lucide-react'

import {
  powerSystems,
  instruments,
  communicationSystems,
  storageSystems,
} from '../../data/spacecraftOptions'

import type { SpacecraftConfiguration } from '../../types/mission'

const MAX_BUDGET = 1000
const MAX_MASS = 25

const initialConfiguration: SpacecraftConfiguration = {
  powerSystemId: 'power-standard',
  instrumentIds: ['camera', 'radar'],
  communicationSystemId: 'antenna-standard',
  storageSystemId: 'storage-standard',
}

function SpacecraftDesigner() {
  const [configuration, setConfiguration] =
    useState<SpacecraftConfiguration>(initialConfiguration)

  const specifications = useMemo(() => {
    const power = powerSystems.find(
      (item) => item.id === configuration.powerSystemId,
    )!

    const communication = communicationSystems.find(
      (item) => item.id === configuration.communicationSystemId,
    )!

    const storage = storageSystems.find(
      (item) => item.id === configuration.storageSystemId,
    )!

    const selectedInstruments = instruments.filter((item) =>
      configuration.instrumentIds.includes(item.id),
    )

    const totalMass =
      power.mass +
      communication.mass +
      storage.mass +
      selectedInstruments.reduce((sum, item) => sum + item.mass, 0)

    const totalCost =
      power.cost +
      communication.cost +
      storage.cost +
      selectedInstruments.reduce((sum, item) => sum + item.cost, 0)

    const totalInstrumentPower = selectedInstruments.reduce(
      (sum, item) => sum + item.powerConsumption,
      0,
    )

    const totalScienceValue = selectedInstruments.reduce(
      (sum, item) => sum + item.scienceValue,
      0,
    )

    return {
      totalMass,
      totalCost,
      batteryCapacity: power.batteryCapacity,
      solarGeneration: power.solarGeneration,
      totalInstrumentPower,
      communicationRate: communication.dataRate,
      storageCapacity: storage.capacity,
      totalScienceValue,
      selectedInstruments,
    }
  }, [configuration])

  const budgetValid = specifications.totalCost <= MAX_BUDGET
  const massValid = specifications.totalMass <= MAX_MASS
  const designValid =
    budgetValid &&
    massValid &&
    specifications.selectedInstruments.length > 0

  const remainingBudget = MAX_BUDGET - specifications.totalCost
  const remainingMass = MAX_MASS - specifications.totalMass

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
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition ${
        selected
          ? 'border-cyan-400 bg-cyan-400/[0.07]'
          : 'border-white/10 bg-[#111b2b] hover:border-white/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? 'border-cyan-400 bg-cyan-400 text-slate-950'
              : 'border-white/20'
          }`}
        >
          {selected && <Check size={14} />}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
        {details.map((detail) => (
          <span key={detail}>{detail}</span>
        ))}
      </div>
    </button>
  )

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-cyan-400">
            SPACECRAFT ENGINEERING / CONFIGURATION
          </p>
          <h1 className="text-3xl font-bold md:text-4xl">
            Design Your Spacecraft
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Every component affects your mission. Choose wisely.
          </p>
        </div>

        <button
          onClick={resetConfiguration}
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
        >
          <RotateCcw size={16} />
          Reset design
        </button>
      </section>

      {/* Engineering constraints */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Mission budget</span>
            <Wallet size={20} className="text-amber-400" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-2xl font-bold">
              {specifications.totalCost.toLocaleString()} / 1,000
            </span>
            <span
              className={`text-xs ${
                budgetValid ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {remainingBudget >= 0
                ? `${remainingBudget} remaining`
                : `${Math.abs(remainingBudget)} over budget`}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${
                budgetValid ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{
                width: `${Math.min(
                  (specifications.totalCost / MAX_BUDGET) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111b2b] p-5">
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Spacecraft mass</span>
            <Weight size={20} className="text-cyan-400" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-2xl font-bold">
              {specifications.totalMass} / 25 kg
            </span>
            <span
              className={`text-xs ${
                massValid ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {remainingMass >= 0
                ? `${remainingMass} kg remaining`
                : `${Math.abs(remainingMass)} kg overweight`}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${
                massValid ? 'bg-cyan-400' : 'bg-red-400'
              }`}
              style={{
                width: `${Math.min(
                  (specifications.totalMass / MAX_MASS) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_350px]">
        <div className="space-y-8">
          {/* Power system */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <BatteryCharging className="text-cyan-400" size={22} />
              <div>
                <h2 className="font-semibold">Power System</h2>
                <p className="text-xs text-slate-500">
                  Select your spacecraft energy system.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
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
              <Camera className="text-violet-400" size={22} />
              <div>
                <h2 className="font-semibold">Scientific Instruments</h2>
                <p className="text-xs text-slate-500">
                  Install instruments for your scientific objectives.
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
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <RadioTower className="text-amber-400" size={22} />
              <div>
                <h2 className="font-semibold">Communication System</h2>
                <p className="text-xs text-slate-500">
                  Choose your data transmission capability.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {communicationSystems.map((item) => (
                <OptionCard
                  key={item.id}
                  title={item.name}
                  description={`${item.dataRate} MB/min transmission`}
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
              <Database className="text-emerald-400" size={22} />
              <div>
                <h2 className="font-semibold">Data Storage</h2>
                <p className="text-xs text-slate-500">
                  Select your onboard data capacity.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
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
        <aside className="h-fit space-y-5 rounded-xl border border-white/10 bg-[#111b2b] p-5 xl:sticky xl:top-6">
          <div>
            <p className="text-xs tracking-widest text-cyan-400">
              ENGINEERING REPORT
            </p>
            <h2 className="mt-2 text-xl font-bold">MW-01 Explorer</h2>
            <p className="mt-1 text-xs text-slate-500">
              Live spacecraft specifications
            </p>
          </div>

          <div className="space-y-4 border-y border-white/10 py-5">
            {[
              ['Battery capacity', `${specifications.batteryCapacity} Wh`],
              ['Solar generation', `${specifications.solarGeneration} W`],
              ['Instrument power', `${specifications.totalInstrumentPower} W`],
              ['Communication', `${specifications.communicationRate} MB/min`],
              ['Data capacity', `${specifications.storageCapacity} MB`],
              ['Scientific value', `${specifications.totalScienceValue}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-3 text-sm"
              >
                <span className="text-slate-400">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              {designValid ? (
                <ShieldCheck className="text-emerald-400" size={19} />
              ) : (
                <AlertTriangle className="text-red-400" size={19} />
              )}
              <span className="text-sm font-semibold">
                {designValid ? 'Design valid' : 'Design needs attention'}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <p className={budgetValid ? 'text-emerald-400' : 'text-red-400'}>
                {budgetValid ? '✓' : '✕'} Budget constraint
              </p>
              <p className={massValid ? 'text-emerald-400' : 'text-red-400'}>
                {massValid ? '✓' : '✕'} Mass constraint
              </p>
              <p
                className={
                  specifications.selectedInstruments.length > 0
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }
              >
                {specifications.selectedInstruments.length > 0 ? '✓' : '✕'} At
                least one scientific instrument
              </p>
            </div>
          </div>

          <button
            onClick={saveConfiguration}
            disabled={!designValid}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Check size={18} />
            Save Spacecraft
          </button>

          <p className="text-center text-[10px] leading-relaxed text-slate-500">
            Your valid configuration will be saved locally for the next
            mission stage.
          </p>
        </aside>
      </div>
    </div>
  )
}

export default SpacecraftDesigner
