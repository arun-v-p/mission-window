import { OrbitControls } from '@react-three/drei'

function MissionCamera() {
  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={1.3}
      maxDistance={9}
      target={[0, 0, 0]}
    />
  )
}

export default MissionCamera
