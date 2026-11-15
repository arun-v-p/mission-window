import type { SpacecraftConfiguration } from '../../types/mission'
import type { MissionEngineState } from '../../simulation/missionEngine'
import Earth from '../environment/Earth'
import StarField from '../environment/StarField'
import SpacecraftModel from '../spacecraft/SpacecraftModel'

interface SpaceSceneProps {
  configuration: SpacecraftConfiguration
  missionState?: MissionEngineState | null
}

function SpaceScene({ configuration, missionState }: SpaceSceneProps) {
  return (
    <>
      <color attach="background" args={['#020611']} />
      <ambientLight intensity={0.28} />
      <directionalLight
        color="#fff1d2"
        intensity={3.8}
        position={[4, 3, 5]}
      />
      <pointLight color="#168bff" intensity={0.45} position={[-4, -1, -3]} />
      <StarField />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.22, 0.008, 6, 180]} />
        <meshBasicMaterial
          color="#5bb8f4"
          transparent
          opacity={0.2}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Earth />
      <SpacecraftModel configuration={configuration} missionState={missionState} />
    </>
  )
}

export default SpaceScene
