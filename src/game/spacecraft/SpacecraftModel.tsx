import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, Group } from 'three'
import {
  communicationSystems,
  instruments,
  powerSystems,
} from '../../data/spacecraftOptions'
import type {
  ScientificInstrument,
  SpacecraftConfiguration,
} from '../../types/mission'
import type { MissionEngineState } from '../../simulation/missionEngine'

interface SpacecraftModelProps {
  configuration: SpacecraftConfiguration
  missionState?: MissionEngineState | null
}

function SolarPanelArray({ side, scale }: { side: number; scale: number }) {
  return (
    <group
      position={[side * 0.48 * scale, 0, 0]}
      scale={[scale, 1, 1]}
    >
      <mesh>
        <boxGeometry args={[0.62, 0.035, 0.38]} />
        <meshStandardMaterial
          color="#145ba1"
          metalness={0.42}
          roughness={0.42}
        />
      </mesh>
      {[-0.22, -0.11, 0, 0.11, 0.22].map((position) => (
        <mesh key={position} position={[position, 0.021, 0]}>
          <boxGeometry args={[0.009, 0.004, 0.36]} />
          <meshBasicMaterial color="#6ebdff" />
        </mesh>
      ))}
      {[-0.12, 0.12].map((position) => (
        <mesh key={position} position={[0, 0.021, position]}>
          <boxGeometry args={[0.6, 0.004, 0.009]} />
          <meshBasicMaterial color="#6ebdff" />
        </mesh>
      ))}
    </group>
  )
}

function InstrumentModule({
  instrument,
  index,
  count,
}: {
  instrument: ScientificInstrument
  index: number
  count: number
}) {
  const offsetX = (index - (count - 1) / 2) * 0.16

  return (
    <group position={[offsetX, 0.135, 0]}>
      <mesh position={[0, 0.018, 0]}>
        <boxGeometry args={[0.12, 0.035, 0.12]} />
        <meshStandardMaterial
          color="#a98b59"
          metalness={0.55}
          roughness={0.38}
        />
      </mesh>

      {instrument.id === 'camera' && (
        <group>
          <mesh position={[0, 0.067, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.05, 0.07, 12]} />
            <meshStandardMaterial color="#536b7d" metalness={0.72} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.067, 0.063]}>
            <sphereGeometry args={[0.032, 12, 8]} />
            <meshStandardMaterial
              color="#52bfff"
              emissive="#126da4"
              emissiveIntensity={0.35}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {instrument.id === 'radar' && (
        <group>
          <mesh position={[0, 0.067, 0]}>
            <boxGeometry args={[0.14, 0.025, 0.115]} />
            <meshStandardMaterial color="#4d5964" metalness={0.65} roughness={0.32} />
          </mesh>
          {[-0.035, 0, 0.035].map((position) => (
            <mesh key={position} position={[position, 0.083, 0]}>
              <boxGeometry args={[0.008, 0.005, 0.105]} />
              <meshBasicMaterial color="#f0bd69" />
            </mesh>
          ))}
        </group>
      )}

      {instrument.id === 'spectrometer' && (
        <group>
          <mesh position={[0, 0.075, 0]}>
            <cylinderGeometry args={[0.045, 0.06, 0.09, 6]} />
            <meshStandardMaterial color="#7561a5" metalness={0.58} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.075, 0.055]}>
            <sphereGeometry args={[0.024, 10, 8]} />
            <meshStandardMaterial
              color="#c6a5ff"
              emissive="#6542a8"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}

function CommunicationAntenna({ dataRate }: { dataRate: number }) {
  const scale = 0.55 + dataRate / 20
  const dishColor = dataRate > 10 ? '#d5b16a' : '#c4d0da'

  return (
    <group position={[0, 0.15, 0.2]} scale={scale}>
      <mesh position={[0, 0.095, 0]}>
        <cylinderGeometry args={[0.018, 0.024, 0.19, 8]} />
        <meshStandardMaterial color="#9babb8" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.19, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={dishColor}
          metalness={0.74}
          roughness={0.28}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.19, 0.13]}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshBasicMaterial color="#8ad8ff" />
      </mesh>
    </group>
  )
}

function SpacecraftModel({ configuration, missionState }: SpacecraftModelProps) {
  const orbitRef = useRef<Group>(null)
  const powerSystem = powerSystems.find(
    (system) => system.id === configuration.powerSystemId,
  )
  const communicationSystem = communicationSystems.find(
    (system) => system.id === configuration.communicationSystemId,
  )
  const installedInstruments = configuration.instrumentIds
    .map((id) => instruments.find((instrument) => instrument.id === id))
    .filter((instrument): instrument is ScientificInstrument =>
      Boolean(instrument),
    )

  const activeObservation = missionState?.activeObservation
  const hasCompletedObservation = (missionState?.completedObservationIds.length ?? 0) > 0
  const missionEnded = missionState?.status === 'completed'

  useFrame(({ clock }) => {
    const orbit = orbitRef.current
    if (!orbit) return

    const time = clock.elapsedTime * 0.075
    orbit.position.set(
      Math.cos(time) * 1.65,
      Math.sin(time * 0.8) * 0.38,
      Math.sin(time) * 1.65,
    )
    orbit.rotation.y = activeObservation ? -time + 0.9 : -time + 0.45
    orbit.rotation.z = Math.sin(time) * 0.08
  })

  if (!powerSystem || !communicationSystem) return null

  const panelScale = powerSystem.solarGeneration / 100

  return (
    <group ref={orbitRef}>
      <group scale={0.72}>
        <mesh>
          <boxGeometry args={[0.3, 0.24, 0.3]} />
          <meshStandardMaterial
            color="#b9c9d8"
            metalness={0.72}
            roughness={0.32}
          />
        </mesh>

        <mesh position={[0, 0.01, 0.16]}>
          <boxGeometry args={[0.19, 0.14, 0.025]} />
          <meshStandardMaterial color="#536d82" metalness={0.55} roughness={0.4} />
        </mesh>

        <mesh position={[0, 0.11, -0.13]}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshBasicMaterial
            color={activeObservation ? '#6ee7ff' : missionEnded ? '#fbbf24' : hasCompletedObservation ? '#86efac' : '#94a3b8'}
          />
        </mesh>

        {activeObservation && (
          <group rotation={[Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
            <coneGeometry args={[0.42, 1.15, 32, 1, true]} />
            <meshBasicMaterial
              color="#4fdcff"
              transparent
              opacity={0.16}
              depthWrite={false}
              side={DoubleSide}
            />
          </group>
        )}

        {[-1, 1].map((side) => (
          <SolarPanelArray key={side} side={side} scale={panelScale} />
        ))}

        {installedInstruments.map((instrument, index) => (
          <InstrumentModule
            key={instrument.id}
            instrument={instrument}
            index={index}
            count={installedInstruments.length}
          />
        ))}

        <CommunicationAntenna dataRate={communicationSystem.dataRate} />
      </group>
    </group>
  )
}

export default SpacecraftModel
