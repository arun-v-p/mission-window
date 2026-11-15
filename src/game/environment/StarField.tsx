import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Group } from 'three'
import useReducedMotion from '../useReducedMotion'

function createStarGeometry() {
  const geometry = new BufferGeometry()
  const positions = new Float32Array(1500 * 3)
  let seed = 2025
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  for (let index = 0; index < 1500; index += 1) {
    const azimuth = random() * Math.PI * 2
    const elevation = Math.acos(2 * random() - 1)
    const radius = 18 + random() * 8
    const offset = index * 3
    positions[offset] = radius * Math.sin(elevation) * Math.cos(azimuth)
    positions[offset + 1] = radius * Math.cos(elevation)
    positions[offset + 2] = radius * Math.sin(elevation) * Math.sin(azimuth)
  }

  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geometry
}

function StarField() {
  const geometry = useMemo(createStarGeometry, [])
  const starsRef = useRef<Group>(null)
  const reducedMotion = useReducedMotion()

  useFrame((_, delta) => {
    if (!reducedMotion && starsRef.current) {
      starsRef.current.rotation.y += delta * 0.0015
    }
  })

  return (
    <group ref={starsRef}>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          color="#c7e6ff"
          size={0.045}
          sizeAttenuation
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

export default StarField
