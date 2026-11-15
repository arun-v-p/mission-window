import { Canvas } from '@react-three/fiber'
import type { SpacecraftConfiguration } from '../types/mission'
import type { MissionEngineState } from '../simulation/missionEngine'
import SpaceScene from './scenes/SpaceScene'
import MissionCamera from './camera/MissionCamera'

interface GameCanvasProps {
  configuration: SpacecraftConfiguration
  missionState?: MissionEngineState | null
}

function GameCanvas({ configuration, missionState }: GameCanvasProps) {
  return (
    <Canvas
      aria-label="Interactive 3D orbital view of Earth and a spacecraft"
      camera={{ position: [0, 2.1, 5.8], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={
        <div className="flex h-full items-center justify-center bg-[#020611] px-6 text-center text-sm text-slate-400">
          This orbital preview requires WebGL support.
        </div>
      }
    >
      <SpaceScene configuration={configuration} missionState={missionState} />
      <MissionCamera />
    </Canvas>
  )
}

export default GameCanvas
