import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Heart,
  Rocket,
  Shield,
  RotateCcw,
  Award,
  FastForward,
  ArrowLeft,
  ArrowRight,
  Flame,
  Clock,
  Compass,
  Target,
  Sparkles,
  CheckCircle,
  Smartphone,
  Crosshair,
} from 'lucide-react'
import { Group, Mesh, MathUtils, DoubleSide } from 'three'
import { audioTelemetry } from '../../utils/audioTelemetry'

export type GamePhase = 'briefing' | 'launching' | 'playing' | 'gameover' | 'victory'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface PlanetOption {
  id: string
  name: string
  category: string
  distanceKm: string
  color: string
  emissive: string
  glowColor: string
  accentColor: string
  hasRings?: boolean
  ringColor?: string
  tag: string
  description: string
  lore: string
}

export interface DifficultyConfig {
  id: Difficulty
  name: string
  label: string
  description: string
  asteroidSpeed: number
  alienSpeed: number
  spawnIntervalMs: number
  alienChance: number
  asteroidHealth: number
  alienHealth: number
  colorBadge: string
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: 'Easy',
    label: 'Cadet Flight',
    description: 'Slower asteroid drift, spaced-out spawns, single-hit alien scouts.',
    asteroidSpeed: 0.85,
    alienSpeed: 1.05,
    spawnIntervalMs: 1700,
    alienChance: 0.35,
    asteroidHealth: 1,
    alienHealth: 2,
    colorBadge: '#34c759',
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    label: 'Standard Orbit',
    description: 'Balanced meteorite belt density, tactical alien cruisers, standard velocity.',
    asteroidSpeed: 1.25,
    alienSpeed: 1.55,
    spawnIntervalMs: 1150,
    alienChance: 0.48,
    asteroidHealth: 1,
    alienHealth: 3,
    colorBadge: '#2997ff',
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    label: 'Hyperdrive Chaos',
    description: 'Blistering speed, dense meteorite storms, heavy armored alien interceptors.',
    asteroidSpeed: 1.7,
    alienSpeed: 2.15,
    spawnIntervalMs: 700,
    alienChance: 0.6,
    asteroidHealth: 2,
    alienHealth: 4,
    colorBadge: '#ff3b30',
  },
}

export const PLANETS: PlanetOption[] = [
  {
    id: 'mars',
    name: 'Mars',
    category: 'The Red Planet',
    distanceKm: '225,000,000 km',
    color: '#d44919',
    emissive: '#8c2805',
    glowColor: '#ff7a45',
    accentColor: '#ff6b4a',
    tag: 'Red Frontier',
    description: 'Traverse the inner solar belt past Deimos and Phobos toward Olympus Mons.',
    lore: 'Heavy asteroid fields encountered around Martian gravity well.',
  },
  {
    id: 'moon',
    name: 'The Moon (Luna)',
    category: 'Earth Satellite',
    distanceKm: '384,400 km',
    color: '#b0b3b8',
    emissive: '#3a3d42',
    glowColor: '#d6e4ff',
    accentColor: '#98989d',
    tag: 'Lunar Base',
    description: 'Intercept orbital lunar research stations above the Sea of Tranquility.',
    lore: 'Hostile alien reconnaissance crafts spotted in lunar shadow craters.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter / Europa',
    category: 'Gas Giant System',
    distanceKm: '628,000,000 km',
    color: '#d49b55',
    emissive: '#7a4e1d',
    glowColor: '#ffd166',
    accentColor: '#ff9f0a',
    tag: 'Outer Giants',
    description: 'Navigate Jovian radiation storms to establish orbit above icy oceanic Europa.',
    lore: 'High electromagnetic pulse interference and dense debris vortex.',
  },
  {
    id: 'titan',
    name: 'Titan (Saturn)',
    category: 'Ringed Moon',
    distanceKm: '1,400,000,000 km',
    color: '#e5a13b',
    emissive: '#824b0c',
    glowColor: '#ffb340',
    accentColor: '#bf5af2',
    hasRings: true,
    ringColor: '#d1b280',
    tag: 'Deep Frontier',
    description: 'Warp past Saturn’s gleaming ice rings into dense methane atmospheric clouds.',
    lore: 'Deep space armada guarding the outer planetary perimeter.',
  },
]

interface LaserBolt {
  id: number
  x: number
  z: number
}

interface MeteorShard {
  id: number
  lane: number
  z: number
}

interface Shockwave {
  id: number
  x: number
  y: number
  z: number
  color: string
  createdAt: number
}

interface Obstacle {
  id: number
  type: 'asteroid' | 'alien'
  lane: number // -1 = Left, 0 = Center, 1 = Right
  z: number
  speed: number
  health: number
  maxHealth: number
  rotationSpeed: number
}

const LANES = [-3.2, 0, 3.2]
const DEFAULT_DURATION_SECONDS = 45 // 30s to 60s hackathon duration

// --- 3D SCENE GRAPHICS COMPONENTS ---

// 1. Futuristic 3-Lane Laser Highway Runway (Subway Surfers in Deep Space)
function SpaceRunwayLanes({ currentLane }: { currentLane: number }) {
  const gridRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (gridRef.current) {
      gridRef.current.children.forEach((child) => {
        child.position.z += 50 * delta
        if (child.position.z > 15) {
          child.position.z -= 120
        }
      })
    }
  })

  return (
    <group position={[0, -1.05, 0]}>
      {/* 4 Neon Guideway Rails */}
      {[-4.8, -1.6, 1.6, 4.8].map((x, i) => (
        <mesh key={i} position={[x, 0, -45]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, 120]} />
          <meshBasicMaterial color="#0071e3" transparent opacity={0.35} />
        </mesh>
      ))}

      {/* Active Glowing Lane under player ship */}
      <mesh
        position={[LANES[currentLane + 1] || 0, 0.01, -12]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[2.8, 32]} />
        <meshBasicMaterial color="#2997ff" transparent opacity={0.15} />
      </mesh>

      {/* Fast scrolling speed chevrons */}
      <group ref={gridRef}>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} position={[0, 0.02, -i * 10]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[9.6, 0.14]} />
            <meshBasicMaterial color="#2997ff" transparent opacity={0.22} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// 2. Volumetric Deep-Space Nebula Clouds
function CosmicNebula() {
  return (
    <group position={[0, 0, -110]}>
      {/* Violet Deep Space Nebula */}
      <mesh position={[-28, 14, -10]}>
        <sphereGeometry args={[22, 16, 16]} />
        <meshBasicMaterial color="#581c87" transparent opacity={0.12} />
      </mesh>
      {/* Cyan Hyperdrive Cloud */}
      <mesh position={[30, -12, -25]}>
        <sphereGeometry args={[25, 16, 16]} />
        <meshBasicMaterial color="#0369a1" transparent opacity={0.14} />
      </mesh>
      {/* Golden Stellar Corona */}
      <mesh position={[0, 26, -40]}>
        <sphereGeometry args={[30, 16, 16]} />
        <meshBasicMaterial color="#7c2d12" transparent opacity={0.09} />
      </mesh>
    </group>
  )
}

// 3. Holographic Targeting Crosshair in Active Lane
function TargetingReticle({ lane }: { lane: number }) {
  const meshRef = useRef<Group>(null)
  const targetX = LANES[lane + 1] || 0
  const currentX = useRef(targetX)

  useFrame((_, delta) => {
    if (meshRef.current) {
      currentX.current = MathUtils.damp(currentX.current, targetX, 14, delta)
      meshRef.current.position.x = currentX.current
      meshRef.current.rotation.z += 1.8 * delta
    }
  })

  return (
    <group ref={meshRef} position={[targetX, -0.15, -12]}>
      <mesh>
        <ringGeometry args={[0.42, 0.48, 24]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
      </mesh>
      {/* Corner crosshairs */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.12, 0.02, 0.02]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  )
}

// 4. Expanding 3D Explosion Shockwave Ring
function ShockwaveMesh({ shockwave }: { shockwave: Shockwave }) {
  const ringRef = useRef<Mesh>(null)

  useFrame(() => {
    if (ringRef.current) {
      const age = (Date.now() - shockwave.createdAt) / 450
      if (age <= 1) {
        const s = 0.5 + age * 3.2
        ringRef.current.scale.set(s, s, 1)
        const mat = ringRef.current.material as any
        if (mat) mat.opacity = Math.max(0, 1 - age)
      }
    }
  })

  return (
    <mesh ref={ringRef} position={[shockwave.x, shockwave.y, shockwave.z]}>
      <ringGeometry args={[0.4, 0.85, 24]} />
      <meshBasicMaterial
        color={shockwave.color}
        transparent
        opacity={1}
        side={DoubleSide}
      />
    </mesh>
  )
}

// 5. Player's AAA Aerospace Spacecraft with Muzzle Flash, Thrusters & Shield
function PlayerShip({
  targetLane,
  isRolling,
  isShielded,
  isFiring,
}: {
  targetLane: number
  isRolling: number
  isShielded: boolean
  isFiring: boolean
}) {
  const groupRef = useRef<Group>(null)
  const thrustersRef = useRef<Group>(null)
  const shieldRef = useRef<Mesh>(null)
  const currentX = useRef(LANES[targetLane + 1] || 0)
  const targetX = LANES[targetLane + 1] || 0

  useFrame((_, delta) => {
    if (!groupRef.current) return
    currentX.current = MathUtils.damp(currentX.current, targetX, 14, delta)
    groupRef.current.position.x = currentX.current

    // Bank / roll ship when changing lanes with smooth inertia
    const targetRoll = (targetX - currentX.current) * -0.22 + isRolling * 0.05
    groupRef.current.rotation.z = MathUtils.damp(
      groupRef.current.rotation.z,
      targetRoll,
      12,
      delta,
    )
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.005) * 0.04

    // Dynamic thruster plasma flame pulsation
    if (thrustersRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.035) * 0.2 + Math.random() * 0.12
      thrustersRef.current.scale.set(1, 1, pulse)
    }

    // Shield rotation
    if (shieldRef.current && isShielded) {
      shieldRef.current.rotation.y += 1.8 * delta
      shieldRef.current.rotation.x += 1.2 * delta
    }
  })

  return (
    <group ref={groupRef} position={[0, -0.4, 0]}>
      {/* Sleek Aerodynamic Fuselage (Titanium / Matte Carbon) */}
      <mesh position={[0, 0, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 2.4, 6]} />
        <meshStandardMaterial color="#f0f2f5" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Main Cockpit Canopy (Sapphire crystal with blue HUD glow) */}
      <mesh position={[0, 0.23, -0.1]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial
          color="#2997ff"
          emissive="#0071e3"
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Swept Stealth Delta Wings */}
      <mesh position={[0, -0.06, 0.45]}>
        <boxGeometry args={[2.5, 0.06, 1.0]} />
        <meshStandardMaterial color="#1c1c1e" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Wingtip Navigation Lights */}
      {/* Left Wingtip: Port Red */}
      <mesh position={[-1.25, -0.04, 0.5]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff453a" emissive="#ff453a" emissiveIntensity={2.5} />
      </mesh>
      {/* Right Wingtip: Starboard Green */}
      <mesh position={[1.25, -0.04, 0.5]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#30d158" emissive="#30d158" emissiveIntensity={2.5} />
      </mesh>

      {/* Heavy Dual Laser Cannon Pods */}
      <mesh position={[-1.05, -0.03, 0.15]}>
        <cylinderGeometry args={[0.05, 0.06, 0.9, 10]} />
        <meshStandardMaterial color="#2997ff" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[1.05, -0.03, 0.15]}>
        <cylinderGeometry args={[0.05, 0.06, 0.9, 10]} />
        <meshStandardMaterial color="#2997ff" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Muzzle Flash Flares when firing lasers */}
      {isFiring && (
        <>
          <mesh position={[-1.05, -0.03, -0.4]}>
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[1.05, -0.03, -0.4]}>
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <pointLight position={[0, 0, -0.5]} intensity={2.8} distance={5} color="#38bdf8" />
        </>
      )}

      {/* Twin Plasma Thruster Engines */}
      <mesh position={[-0.32, -0.06, 1.1]}>
        <cylinderGeometry args={[0.13, 0.18, 0.38, 14]} />
        <meshStandardMaterial color="#0071e3" emissive="#0071e3" emissiveIntensity={1.0} />
      </mesh>
      <mesh position={[0.32, -0.06, 1.1]}>
        <cylinderGeometry args={[0.13, 0.18, 0.38, 14]} />
        <meshStandardMaterial color="#0071e3" emissive="#0071e3" emissiveIntensity={1.0} />
      </mesh>

      {/* Animated Ion Flame Cones */}
      <group ref={thrustersRef}>
        <mesh position={[-0.32, -0.06, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.14, 0.75, 12]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        <mesh position={[0.32, -0.06, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.14, 0.75, 12]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Invulnerability Energy Shield Sphere */}
      {isShielded && (
        <mesh ref={shieldRef} position={[0, 0, 0]}>
          <sphereGeometry args={[1.7, 18, 18]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.2}
            transparent
            opacity={0.35}
            wireframe
          />
        </mesh>
      )}
    </group>
  )
}

// 6. Hyperdrive Streaking Warp Stars
function WarpSpeedStars({ isWarping }: { isWarping: boolean }) {
  const count = 380
  const stars = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 38,
      y: (Math.random() - 0.5) * 24,
      z: -Math.random() * 120,
      length: Math.random() * 3 + 1.8,
    }))
  }, [])

  const starsRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!starsRef.current) return
    const speed = isWarping ? 80 : 14
    starsRef.current.children.forEach((child) => {
      child.position.z += speed * delta
      if (child.position.z > 15) {
        child.position.z = -115
      }
    })
  })

  return (
    <group ref={starsRef}>
      {stars.map((star, i) => (
        <mesh key={i} position={[star.x, star.y, star.z]}>
          <boxGeometry args={[0.06, 0.06, isWarping ? star.length * 2.8 : 0.35]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#38bdf8' : i % 5 === 0 ? '#ff7a45' : '#ffffff'} />
        </mesh>
      ))}
    </group>
  )
}

// 7. Rugged 3D Asteroid Rock with Molten Magma Cracks
function AsteroidMesh({ obstacle }: { obstacle: Obstacle }) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += obstacle.rotationSpeed * delta
      meshRef.current.rotation.y += obstacle.rotationSpeed * 0.8 * delta
    }
  })

  const isDamaged = obstacle.health < obstacle.maxHealth

  return (
    <mesh ref={meshRef} position={[LANES[obstacle.lane + 1], 0, obstacle.z]}>
      <dodecahedronGeometry args={[0.82, 1]} />
      <meshStandardMaterial
        color={isDamaged ? '#ef4444' : '#64748b'}
        emissive={isDamaged ? '#b91c1c' : '#000000'}
        emissiveIntensity={isDamaged ? 0.6 : 0}
        roughness={0.92}
        metalness={0.25}
      />
    </mesh>
  )
}

// 8. Bio-Mechanical 3D Alien War Cruiser with Pulsing Reactor Core
function AlienFighterMesh({ obstacle }: { obstacle: Obstacle }) {
  const groupRef = useRef<Group>(null)
  const coreRef = useRef<Mesh>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(Date.now() * 0.008) * 0.25
    }
    if (coreRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.012) * 0.25
      coreRef.current.scale.set(pulse, pulse, pulse)
    }
  })

  return (
    <group ref={groupRef} position={[LANES[obstacle.lane + 1], 0, obstacle.z]}>
      {/* Obsidian Bio-Mechanical Hull */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.95, 0.45, 0.24, 6]} />
        <meshStandardMaterial
          color="#1e1035"
          emissive="#581c87"
          emissiveIntensity={0.5}
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Forward Attack Mandibles */}
      <mesh position={[-0.45, 0, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.8, 4]} />
        <meshStandardMaterial color="#0f051d" metalness={0.9} />
      </mesh>
      <mesh position={[0.45, 0, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.8, 4]} />
        <meshStandardMaterial color="#0f051d" metalness={0.9} />
      </mesh>

      {/* Pulsing Biomechanical Plasma Eye Core */}
      <mesh ref={coreRef} position={[0, 0.16, -0.1]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="#ff0055"
          emissive="#ff0055"
          emissiveIntensity={2.2}
        />
      </mesh>

      {/* Rear Plasma Exhaust Cones */}
      <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.12, 0.35, 8]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1.5} />
      </mesh>

      {/* Health Pip indicator for heavy cruisers */}
      {obstacle.maxHealth > 1 && (
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[obstacle.health * 0.35, 0.06, 0.06]} />
          <meshBasicMaterial color="#ff0055" />
        </mesh>
      )}
    </group>
  )
}

// 9. High-Energy Laser Bolts
function LaserBoltMesh({ bolt }: { bolt: LaserBolt }) {
  return (
    <group position={[bolt.x, -0.4, bolt.z]}>
      {/* Left Laser */}
      <mesh position={[-1.05, 0, 0]}>
        <boxGeometry args={[0.08, 0.08, 1.6]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      {/* Right Laser */}
      <mesh position={[1.05, 0, 0]}>
        <boxGeometry args={[0.08, 0.08, 1.6]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  )
}

// 10. Slingshot Kinetic Meteor Shard
function MeteorShardMesh({ shard }: { shard: MeteorShard }) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 12 * delta
      meshRef.current.rotation.y += 15 * delta
    }
  })

  return (
    <mesh ref={meshRef} position={[LANES[shard.lane + 1], 0, shard.z]}>
      <dodecahedronGeometry args={[0.48, 0]} />
      <meshStandardMaterial
        color="#ff7a00"
        emissive="#ff3b30"
        emissiveIntensity={1.8}
        roughness={0.4}
      />
    </mesh>
  )
}

// 11. Destination Target Planet with Dynamic Corona & Saturnian Rings
function DestinationPlanet({
  progress,
  planet,
}: {
  progress: number
  planet: PlanetOption
}) {
  const zPos = -120 + progress * 0.95
  const s = 3.6 + progress * 0.08

  return (
    <group position={[0, 0, zPos]} scale={[s, s, s]}>
      {/* Main Planetary Sphere */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={planet.color}
          roughness={0.7}
          metalness={0.15}
          emissive={planet.emissive}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Atmospheric Corona */}
      <mesh scale={[1.09, 1.09, 1.09]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={planet.glowColor}
          transparent
          opacity={0.3}
          emissive={planet.glowColor}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Saturnian Rings (if Titan/Saturn selected) */}
      {planet.hasRings && (
        <mesh rotation={[Math.PI / 3, 0.25, 0]}>
          <ringGeometry args={[1.35, 2.45, 48]} />
          <meshStandardMaterial
            color={planet.ringColor || '#d1b280'}
            side={DoubleSide}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </group>
  )
}

// 12. Cape Canaveral Launchpad Rocket
function LaunchRocket({ altitude }: { altitude: number }) {
  return (
    <group position={[0, altitude - 2.5, -4]}>
      {/* Rocket Body */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 4.5, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Nosecone */}
      <mesh position={[0, 4.2, 0]}>
        <coneGeometry args={[0.35, 1.2, 16]} />
        <meshStandardMaterial color="#0071e3" metalness={0.5} roughness={0.2} />
      </mesh>

      {/* Rocket Flame Particle Glow */}
      <mesh position={[0, -1.2, 0]}>
        <coneGeometry args={[0.45, 2.2, 12]} />
        <meshBasicMaterial color="#ff9f0a" />
      </mesh>
      <mesh position={[0, -1.8, 0]}>
        <coneGeometry args={[0.25, 1.5, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

// Time formatter
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// --- MAIN RUNNER COMPONENT ---
export default function SpaceRunnerGame({
  onExit,
}: {
  onExit: () => void
}) {
  // Pre-game configuration states
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium')
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetOption>(PLANETS[0])
  const [selectedDuration, setSelectedDuration] = useState<number>(DEFAULT_DURATION_SECONDS)

  // Game loop phases: starts at 'briefing' prompt!
  const [phase, setPhase] = useState<GamePhase>('briefing')
  const [launchCountdown, setLaunchCountdown] = useState(3)
  const [launchAltitude, setLaunchAltitude] = useState(0)

  // Gameplay states
  const [targetLane, setTargetLane] = useState(0) // -1, 0, 1
  const [lives, setLives] = useState(3)
  const [elapsedSeconds, setElapsedSeconds] = useState(0) // 0 to selectedDuration (30s to 60s)
  const [checkpointTime, setCheckpointTime] = useState(0) // Checkpoint in seconds
  const [score, setScore] = useState(0)
  const [aliensDestroyed, setAliensDestroyed] = useState(0)
  const [asteroidsDestroyed, setAsteroidsDestroyed] = useState(0)
  const [slingshotCombos, setSlingshotCombos] = useState(0)
  const [flashDamage, setFlashDamage] = useState(false)
  const [isShielded, setIsShielded] = useState(false)
  const [isFiring, setIsFiring] = useState(false)
  const [checkpointNotification, setCheckpointNotification] = useState<string | null>(null)
  const [comboBanner, setComboBanner] = useState<string | null>(null)

  // Entities
  const [lasers, setLasers] = useState<LaserBolt[]>([])
  const [meteorShards, setMeteorShards] = useState<MeteorShard[]>([])
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([])
  const [obstacles, setObstacles] = useState<Obstacle[]>([])

  const nextId = useRef(1)
  const lastSpawn = useRef(0)
  const rolling = useRef(0)
  const invulnerableUntil = useRef(0)

  // Touch Swipe Gesture Tracking for Mobile
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const diffConfig = DIFFICULTIES[selectedDifficulty]
  const progressPercent = Math.min(100, (elapsedSeconds / selectedDuration) * 100)
  const remainingSeconds = Math.max(0, selectedDuration - elapsedSeconds)

  // Start launch countdown from briefing screen
  const startLaunchSequence = () => {
    audioTelemetry.playClick()
    setPhase('launching')
    setLaunchCountdown(3)
    setLaunchAltitude(0)
  }

  // 1. Launchpad Countdown & Ascend Animation
  useEffect(() => {
    if (phase !== 'launching') return

    audioTelemetry.playQuindarTone()

    const interval = setInterval(() => {
      setLaunchCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // Rocket ignition!
          audioTelemetry.playThrusterManeuver()
          let alt = 0
          const launchAnim = setInterval(() => {
            alt += 0.35
            setLaunchAltitude(alt)
            if (alt > 9) {
              clearInterval(launchAnim)
              audioTelemetry.playWarpJump()
              setPhase('playing')
            }
          }, 35)
          return 0
        }
        audioTelemetry.playClick()
        return prev - 1
      })
    }, 900)

    return () => clearInterval(interval)
  }, [phase])

  // Skip launch straight into light speed
  const skipLaunch = () => {
    audioTelemetry.playWarpJump()
    setPhase('playing')
  }

  // 2. Lane Switching Handlers
  const moveLeft = useCallback(() => {
    setTargetLane((current) => {
      if (current > -1) {
        audioTelemetry.playClick()
        rolling.current = -1
        return current - 1
      }
      return current
    })
  }, [])

  const moveRight = useCallback(() => {
    setTargetLane((current) => {
      if (current < 1) {
        audioTelemetry.playClick()
        rolling.current = 1
        return current + 1
      }
      return current
    })
  }, [])

  // 3. Laser Gun Shooting with Muzzle Flash
  const fireLaser = useCallback(() => {
    if (phase !== 'playing') return
    audioTelemetry.playLaserShot()
    setIsFiring(true)
    setTimeout(() => setIsFiring(false), 90)

    const boltX = LANES[targetLane + 1]
    setLasers((prev) => [
      ...prev,
      { id: nextId.current++, x: boltX, z: -1.2 },
    ])
  }, [phase, targetLane])

  // Mobile Touch Gestures (Swiping anywhere left/right moves lane, tapping fires lasers)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (phase !== 'playing') return
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (phase !== 'playing' || touchStartX.current === null) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - (touchStartY.current || 0)

    // Horizontal swipe threshold: 35px
    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        moveLeft()
      } else {
        moveRight()
      }
    } else if (Math.abs(deltaX) < 18 && Math.abs(deltaY) < 18) {
      // Tap on open screen to fire lasers!
      fireLaser()
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  // Keyboard Event Listeners (A / D, Left / Right, Spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLeft()
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveRight()
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        fireLaser()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, moveLeft, moveRight, fireLaser])

  // 4. Game Loop: Movement, Spawning, Collisions, 30s-60s Flight Timer
  useEffect(() => {
    if (phase !== 'playing') return

    const tickMs = 35
    const cp1 = Math.round(selectedDuration * 0.33)
    const cp2 = Math.round(selectedDuration * 0.66)

    const loop = setInterval(() => {
      // Advance flight time towards selected duration (30s to 60s)
      setElapsedSeconds((sec) => {
        const nextSec = sec + tickMs / 1000

        // Checkpoint 1 (Alpha) at 33%
        if (sec < cp1 && nextSec >= cp1) {
          setCheckpointTime(cp1)
          setCheckpointNotification(`CHECKPOINT ALPHA REACHED (33% • ${formatTime(cp1)})`)
          audioTelemetry.playCheckpoint()
          setTimeout(() => setCheckpointNotification(null), 2500)
        }

        // Checkpoint 2 (Bravo) at 66%
        if (sec < cp2 && nextSec >= cp2) {
          setCheckpointTime(cp2)
          setCheckpointNotification(`CHECKPOINT BRAVO REACHED (66% • ${formatTime(cp2)})`)
          audioTelemetry.playCheckpoint()
          setTimeout(() => setCheckpointNotification(null), 2500)
        }

        // 100% Planetary Orbit Arrival
        if (nextSec >= selectedDuration) {
          setPhase('victory')
          audioTelemetry.playMissionSuccess()
          return selectedDuration
        }
        return nextSec
      })

      // Update Shield state
      setIsShielded(Date.now() < invulnerableUntil.current)

      // Clean up finished explosion shockwaves
      setShockwaves((prev) => prev.filter((s) => Date.now() - s.createdAt < 500))

      // Spawn Obstacles according to difficulty configuration
      const now = Date.now()
      if (now - lastSpawn.current > diffConfig.spawnIntervalMs) {
        lastSpawn.current = now
        const isAlien = Math.random() < diffConfig.alienChance
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)]

        setObstacles((prev) => [
          ...prev,
          {
            id: nextId.current++,
            type: isAlien ? 'alien' : 'asteroid',
            lane,
            z: -95,
            speed: isAlien ? diffConfig.alienSpeed : diffConfig.asteroidSpeed,
            health: isAlien ? diffConfig.alienHealth : diffConfig.asteroidHealth,
            maxHealth: isAlien ? diffConfig.alienHealth : diffConfig.asteroidHealth,
            rotationSpeed: Math.random() * 2 + 1,
          },
        ])
      }

      // Move Lasers forward
      setLasers((prev) =>
        prev
          .map((bolt) => ({ ...bolt, z: bolt.z - 2.8 }))
          .filter((bolt) => bolt.z > -100),
      )

      // Move Slingshot Meteor Shards forward
      setMeteorShards((prev) =>
        prev
          .map((shard) => ({ ...shard, z: shard.z - 3.8 }))
          .filter((shard) => shard.z > -100),
      )

      // Test Meteor Shard impacts into oncoming Alien Ships (Meteor Slingshot Mechanic!)
      setMeteorShards((currentShards) => {
        let keptShards = [...currentShards]

        setObstacles((currentObs) => {
          return currentObs.filter((obs) => {
            if (obs.type !== 'alien') return true

            const hittingShardIndex = keptShards.findIndex(
              (s) => s.lane === obs.lane && Math.abs(s.z - obs.z) < 3.2,
            )

            if (hittingShardIndex !== -1) {
              // Obliterated by slingshot meteor!
              audioTelemetry.playExplosion()

              // Spawn 3D Shockwave
              setShockwaves((shocks) => [
                ...shocks,
                {
                  id: nextId.current++,
                  x: LANES[obs.lane + 1],
                  y: 0,
                  z: obs.z,
                  color: '#a855f7',
                  createdAt: Date.now(),
                },
              ])

              setAliensDestroyed((c) => c + 1)
              setSlingshotCombos((c) => c + 1)
              setScore((s) => s + 750)
              setComboBanner('☄️ METEOR SLINGSHOT COMBO! +750 PTS')
              setTimeout(() => setComboBanner(null), 2500)

              // Remove the shard that collided
              keptShards = keptShards.filter((_, idx) => idx !== hittingShardIndex)
              return false // Alien destroyed
            }
            return true
          })
        })

        return keptShards
      })

      // Move Obstacles backward toward player & test collisions
      setObstacles((prev) => {
        const updated: Obstacle[] = []

        prev.forEach((obstacle) => {
          const nextZ = obstacle.z + obstacle.speed * 1.4

          // Test laser hits
          let destroyedByLaser = false

          setLasers((currentLasers) => {
            const hitIndex = currentLasers.findIndex(
              (bolt) =>
                Math.abs(bolt.x - LANES[obstacle.lane + 1]) < 1.1 &&
                Math.abs(bolt.z - obstacle.z) < 2.5,
            )

            if (hitIndex !== -1) {
              obstacle.health -= 1

              if (obstacle.health <= 0) {
                destroyedByLaser = true
                audioTelemetry.playExplosion()

                // Spawn 3D Explosion Shockwave
                setShockwaves((shocks) => [
                  ...shocks,
                  {
                    id: nextId.current++,
                    x: LANES[obstacle.lane + 1],
                    y: 0,
                    z: obstacle.z,
                    color: obstacle.type === 'alien' ? '#a855f7' : '#ff7a00',
                    createdAt: Date.now(),
                  },
                ])

                if (obstacle.type === 'alien') {
                  setAliensDestroyed((c) => c + 1)
                  setScore((s) => s + 350)
                } else {
                  // Asteroid shattered! Throw a kinetic meteor shard forward into the lane!
                  setAsteroidsDestroyed((c) => c + 1)
                  setScore((s) => s + 150)
                  setMeteorShards((shards) => [
                    ...shards,
                    {
                      id: nextId.current++,
                      lane: obstacle.lane,
                      z: obstacle.z - 2.0,
                    },
                  ])
                }
              } else {
                audioTelemetry.playClick()
              }

              // Remove consumed laser bolt
              return currentLasers.filter((_, idx) => idx !== hitIndex)
            }
            return currentLasers
          })

          if (destroyedByLaser) return

          // Test player collision (at z ≈ 0)
          const isInvulnerable = Date.now() < invulnerableUntil.current
          if (
            !isInvulnerable &&
            Math.abs(nextZ - 0) < 1.4 &&
            obstacle.lane === targetLane
          ) {
            // Player hit!
            audioTelemetry.playDamageHit()
            setFlashDamage(true)
            setTimeout(() => setFlashDamage(false), 300)

            setLives((currentLives) => {
              const remaining = currentLives - 1
              if (remaining <= 0) {
                setPhase('gameover')
                audioTelemetry.playWarningAlert()
                return 0
              } else {
                // Respawn at last checkpoint with invulnerability grace period!
                setElapsedSeconds(checkpointTime)
                invulnerableUntil.current = Date.now() + 3000 // 3 seconds shield
                setCheckpointNotification(
                  `RESPAWNING AT CHECKPOINT (${Math.round((checkpointTime / selectedDuration) * 100)}% • SHIELD ACTIVE)`,
                )
                setTimeout(() => setCheckpointNotification(null), 2800)
                return remaining
              }
            })
            return
          }

          // Keep obstacle if within screen bounds
          if (nextZ < 10) {
            updated.push({ ...obstacle, z: nextZ })
          }
        })

        return updated
      })
    }, tickMs)

    return () => clearInterval(loop)
  }, [phase, targetLane, checkpointTime, diffConfig, selectedDuration])

  // Restart from beginning after gameover
  const restartFromBeginning = () => {
    setLives(3)
    setElapsedSeconds(0)
    setCheckpointTime(0)
    setScore(0)
    setAliensDestroyed(0)
    setAsteroidsDestroyed(0)
    setSlingshotCombos(0)
    setObstacles([])
    setLasers([])
    setMeteorShards([])
    setShockwaves([])
    setLaunchCountdown(3)
    setLaunchAltitude(0)
    setPhase('briefing')
  }

  return (
    <div
      className="fixed inset-0 z-[100] h-screen w-screen bg-[#000000] overflow-hidden select-none font-sans text-white touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Red screen flash when taking damage */}
      {flashDamage && (
        <div className="pointer-events-none absolute inset-0 z-50 bg-red-600/35 transition-opacity" />
      )}

      {/* 3D Canvas with Elevated Camera for Clear Vanishing Horizon */}
      <Canvas
        camera={{ position: [0, 2.8, 5.8], fov: 62 }}
        className="absolute inset-0 z-0"
      >
        <ambientLight intensity={0.5} color="#0c1d36" />
        <directionalLight position={[12, 22, 16]} intensity={1.8} color="#ffffff" />
        <pointLight position={[0, -0.4, 2.0]} intensity={1.5} color="#38bdf8" />
        <pointLight position={[0, 0, -40]} intensity={1.2} color={selectedPlanet.glowColor} />

        {phase === 'launching' ? (
          <>
            <LaunchRocket altitude={launchAltitude} />
            <ambientLight intensity={0.6} />
          </>
        ) : (
          <>
            {/* Deep Cosmic Volumetric Nebula Clouds */}
            <CosmicNebula />

            {/* Hyperdrive Warp Stars */}
            <WarpSpeedStars isWarping={phase === 'playing'} />

            {/* 3D Holographic Speed Highway Runway */}
            <SpaceRunwayLanes currentLane={targetLane} />

            {/* Holographic Targeting Reticle */}
            <TargetingReticle lane={targetLane} />

            {/* Player's Jet Spacecraft */}
            <PlayerShip
              targetLane={targetLane}
              isRolling={rolling.current}
              isShielded={isShielded}
              isFiring={isFiring}
            />

            {/* Lasers */}
            {lasers.map((bolt) => (
              <LaserBoltMesh key={bolt.id} bolt={bolt} />
            ))}

            {/* Kinetic Slingshot Meteor Shards */}
            {meteorShards.map((shard) => (
              <MeteorShardMesh key={shard.id} shard={shard} />
            ))}

            {/* 3D Explosion Shockwaves */}
            {shockwaves.map((shock) => (
              <ShockwaveMesh key={shock.id} shockwave={shock} />
            ))}

            {/* Obstacles: Asteroids and Alien Ships */}
            {obstacles.map((obstacle) =>
              obstacle.type === 'asteroid' ? (
                <AsteroidMesh key={obstacle.id} obstacle={obstacle} />
              ) : (
                <AlienFighterMesh key={obstacle.id} obstacle={obstacle} />
              ),
            )}

            {/* Destination Planet approaching in distance */}
            <DestinationPlanet progress={progressPercent} planet={selectedPlanet} />
          </>
        )}
      </Canvas>

      {/* --- PHASE 0: PRE-MISSION BRIEFING PROMPT (PLANET & DIFFICULTY SELECTION) --- */}
      {phase === 'briefing' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
          <div className="apple-glass rounded-3xl p-5 sm:p-7 md:p-8 max-w-3xl w-full max-h-[94vh] overflow-y-auto border border-white/[0.12] shadow-2xl space-y-5 my-auto text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#0071e3]/20 border border-[#2997ff]/30 px-2.5 py-0.5 text-[10px] font-semibold text-[#2997ff] uppercase tracking-wider">
                    NASA Mission Window • Flight Briefing
                  </span>
                  <span className="text-[11px] font-mono text-[#86868b] flex items-center gap-1">
                    <Clock size={12} /> {selectedDuration}s FLIGHT
                  </span>
                  <span className="text-[10px] text-emerald-400 border border-emerald-400/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Smartphone size={10} /> Mobile Ready
                  </span>
                </div>
                <h2 className="mt-1.5 text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white apple-headline">
                  Configure Deep Space Voyage
                </h2>
                <p className="text-xs text-[#86868b] mt-0.5">
                  Select destination planet, flight difficulty, and mission duration.
                </p>
              </div>

              <button
                type="button"
                onClick={onExit}
                className="apple-pill-btn flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] px-3 py-1.5 text-xs text-[#86868b] hover:text-white transition"
              >
                <ArrowLeft size={13} /> Exit
              </button>
            </div>

            {/* Section 1: Choose Target Planet */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wider text-white uppercase flex items-center gap-1.5">
                  <Compass size={14} className="text-[#2997ff]" /> 1. Select Target Planet / Destination
                </p>
                <span className="text-[11px] text-[#2997ff] font-mono">
                  {selectedPlanet.name} • {selectedPlanet.distanceKm}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {PLANETS.map((planet) => {
                  const isSelected = selectedPlanet.id === planet.id
                  return (
                    <button
                      key={planet.id}
                      type="button"
                      onClick={() => {
                        audioTelemetry.playClick()
                        setSelectedPlanet(planet)
                      }}
                      className={`group relative rounded-2xl p-3 sm:p-4 text-left transition-all duration-200 border ${
                        isSelected
                          ? 'border-[#2997ff] bg-[#0071e3]/15 shadow-[0_0_24px_rgba(41,151,255,0.25)]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.18]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div
                          className="h-3.5 w-3.5 rounded-full shadow-md"
                          style={{ backgroundColor: planet.color }}
                        />
                        <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded-full bg-white/10 text-white/80">
                          {planet.tag}
                        </span>
                      </div>
                      <p className="font-semibold text-xs sm:text-sm text-white group-hover:text-[#2997ff] transition">
                        {planet.name}
                      </p>
                      <p className="text-[10px] text-[#86868b] mt-0.5 font-mono">
                        {planet.distanceKm}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Section 2: Choose Difficulty */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold tracking-wider text-white uppercase flex items-center gap-1.5">
                <Target size={14} className="text-[#2997ff]" /> 2. Select Asteroid & Combat Difficulty
              </p>

              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map((diffKey) => {
                  const d = DIFFICULTIES[diffKey]
                  const isSelected = selectedDifficulty === diffKey
                  return (
                    <button
                      key={diffKey}
                      type="button"
                      onClick={() => {
                        audioTelemetry.playClick()
                        setSelectedDifficulty(diffKey)
                      }}
                      className={`rounded-2xl p-3 sm:p-4 text-left transition-all duration-200 border ${
                        isSelected
                          ? 'border-[#2997ff] bg-[#0071e3]/15 shadow-[0_0_20px_rgba(41,151,255,0.25)]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.18]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: d.colorBadge }}
                          />
                          {d.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#86868b] leading-tight">
                        {d.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Section 3: Choose Mission Duration (30s to 60s) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wider text-white uppercase flex items-center gap-1.5">
                  <Clock size={14} className="text-[#ff9f0a]" /> 3. Select Mission Duration (30s – 60s)
                </p>
                <span className="text-[11px] text-[#ff9f0a] font-mono">
                  {selectedDuration}s Flight Window
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { sec: 30, title: '30 Seconds', tag: 'Fast Sprint', desc: 'Quick demo' },
                  { sec: 45, title: '45 Seconds', tag: 'Recommended', desc: 'Optimal pacing' },
                  { sec: 60, title: '60 Seconds', tag: 'Full Flight', desc: '1-min voyage' },
                ].map((dOpt) => {
                  const isSel = selectedDuration === dOpt.sec
                  return (
                    <button
                      key={dOpt.sec}
                      type="button"
                      onClick={() => {
                        audioTelemetry.playClick()
                        setSelectedDuration(dOpt.sec)
                      }}
                      className={`rounded-2xl p-3 sm:p-3.5 text-left transition-all duration-200 border ${
                        isSel
                          ? 'border-[#ff9f0a] bg-[#ff9f0a]/15 shadow-[0_0_20px_rgba(255,159,10,0.25)]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.18]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs sm:text-sm text-white">{dOpt.title}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-white/10 text-[#ff9f0a]">
                        {dOpt.tag}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Section 4: Mobile & Desktop Controls Banner */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-xs text-[#86868b] space-y-1">
              <div className="flex items-center gap-2 text-white font-medium">
                <Sparkles size={13} className="text-[#ff9f0a]" />
                <span>Controls & Mobile Tips:</span>
              </div>
              <p>
                • <strong>Desktop</strong>: <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">A</kbd> / <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">D</kbd> or <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">←</kbd> <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">→</kbd> to steer, <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">Space</kbd> to blast lasers.
              </p>
              <p>
                • <strong>Mobile</strong>: Swipe left/right or use on-screen thumb buttons; tap screen or the big <strong>FIRE</strong> button to shoot!
              </p>
              <p>
                • <strong>Slingshot</strong>: Blasting asteroids shoots kinetic meteorites into alien ships for <strong>+750 PTS</strong>!
              </p>
            </div>

            {/* Launch Button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={startLaunchSequence}
                className="apple-pill-btn flex-1 bg-gradient-to-r from-[#0071e3] to-[#af52de] hover:opacity-95 text-white py-3.5 text-sm font-semibold shadow-[0_4px_24px_rgba(0,113,227,0.5)] flex items-center justify-center gap-2 transition hover:scale-[1.01]"
              >
                <Rocket size={17} />
                <span>Ignite Engines & Launch ({selectedDuration}s Flight)</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="apple-pill-btn border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] px-5 py-3.5 text-sm font-medium text-white"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PHASE 1: LAUNCHPAD COUNTDOWN --- */}
      {phase === 'launching' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-xs">
          <div className="apple-glass rounded-3xl p-7 max-w-md w-full border border-white/[0.1] shadow-2xl space-y-6">
            <div>
              <span className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1 text-xs text-[#2997ff] font-medium uppercase tracking-widest">
                Cape Canaveral Launchpad 39A
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight apple-headline">
                MISSION LAUNCH
              </h2>
              <p className="mt-2 text-xs text-[#86868b] leading-relaxed">
                T-minus ignition. Deploying into {selectedDuration}-second light-speed trajectory toward <strong>{selectedPlanet.name}</strong> ({diffConfig.name} difficulty).
              </p>
            </div>

            <div className="text-6xl font-extrabold font-mono text-[#2997ff] tracking-tight">
              {launchCountdown > 0 ? launchCountdown : 'IGNITION!'}
            </div>

            <button
              type="button"
              onClick={skipLaunch}
              className="apple-pill-btn w-full bg-[#0071e3] hover:bg-[#0077ed] py-3 text-sm font-medium text-white shadow-[0_4px_20px_rgba(0,113,227,0.4)] flex items-center justify-center gap-2"
            >
              <FastForward size={16} /> Skip Launch to Light Speed
            </button>
          </div>
        </div>
      )}

      {/* --- PHASE 2: PLAYING OVERLAY (CLEAR HORIZON HUD & DUAL THUMB ARCADE PAD) --- */}
      {phase === 'playing' && (
        <>
          {/* Top-Edge 2.5px Flight Vector Progress Bar */}
          <div className="absolute top-0 inset-x-0 z-30 h-[2.5px] bg-white/[0.08]">
            <div
              className="h-full bg-gradient-to-r from-[#0071e3] via-[#2997ff] to-[#34c759] transition-all duration-100 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Vertical Flight Telemetry Rail (Pinned to Right Edge - 100% Clear Center) */}
          <div className="hidden sm:flex absolute right-4 top-20 bottom-32 z-20 flex-col items-center pointer-events-none select-none">
            {/* Target Planet Marker */}
            <div
              className="h-7 w-7 rounded-full shadow-lg flex items-center justify-center text-[11px] border border-white/20 mb-1"
              style={{ backgroundColor: selectedPlanet.color }}
              title={selectedPlanet.name}
            >
              🪐
            </div>
            <span className="text-[9px] font-mono text-[#86868b] uppercase font-bold tracking-tight mb-1">
              {selectedPlanet.name}
            </span>

            {/* Vertical Flight Rail */}
            <div className="relative w-1 flex-1 rounded-full bg-white/[0.1] overflow-hidden my-1">
              {/* Ascending Rocket Progress Line */}
              <div
                className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0071e3] via-[#2997ff] to-[#34c759] rounded-full transition-all duration-150"
                style={{ height: `${progressPercent}%` }}
              />
              {/* 33% Notch Alpha */}
              <div
                className="absolute inset-x-0 h-0.5 bg-white/50"
                style={{ bottom: '33.33%' }}
                title="Checkpoint Alpha (33%)"
              />
              {/* 66% Notch Bravo */}
              <div
                className="absolute inset-x-0 h-0.5 bg-white/50"
                style={{ bottom: '66.66%' }}
                title="Checkpoint Bravo (66%)"
              />
            </div>

            {/* Earth Launch Base */}
            <span className="text-[9px] font-mono text-[#86868b] uppercase font-bold tracking-tight mt-1">
              Earth
            </span>
            <div className="h-4 w-4 rounded-full bg-[#0071e3] border border-white/30 text-[9px] flex items-center justify-center font-bold">
              🌍
            </div>
          </div>

          {/* Floating Side Notifications (Upper Right to never block center vision) */}
          {checkpointNotification && (
            <div className="absolute top-18 right-4 sm:right-14 z-30 animate-bounce">
              <div className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-1.5 backdrop-blur-xl text-xs font-semibold text-[#34c759] shadow-xl flex items-center gap-2">
                <CheckCircle size={14} />
                {checkpointNotification}
              </div>
            </div>
          )}

          {comboBanner && (
            <div className="absolute top-26 right-4 sm:right-14 z-30 animate-pulse">
              <div className="rounded-full border border-amber-400/50 bg-amber-500/25 px-3.5 py-1.5 backdrop-blur-xl text-xs font-bold text-[#ff9f0a] shadow-xl flex items-center gap-2">
                <Flame size={14} />
                {comboBanner}
              </div>
            </div>
          )}

          {/* DUAL THUMB MOBILE & DESKTOP CONTROLS */}
          <div className="absolute bottom-5 inset-x-0 z-30 flex items-end justify-between px-4 sm:px-8 pointer-events-none safe-bottom">
            {/* Left Thumb Cluster: Steer Left & Steer Right */}
            <div className="pointer-events-auto flex items-center gap-2.5">
              <button
                type="button"
                onClick={moveLeft}
                onTouchStart={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  moveLeft()
                }}
                aria-label="Steer Left"
                className="apple-pill-btn flex flex-col items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-white/[0.18] bg-[#161617]/80 hover:bg-white/[0.18] active:scale-90 active:bg-[#0071e3]/40 backdrop-blur-2xl shadow-2xl transition touch-none"
              >
                <ArrowLeft size={22} className="text-white" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#86868b] mt-0.5">Left</span>
              </button>

              <button
                type="button"
                onClick={moveRight}
                onTouchStart={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  moveRight()
                }}
                aria-label="Steer Right"
                className="apple-pill-btn flex flex-col items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-white/[0.18] bg-[#161617]/80 hover:bg-white/[0.18] active:scale-90 active:bg-[#0071e3]/40 backdrop-blur-2xl shadow-2xl transition touch-none"
              >
                <ArrowRight size={22} className="text-white" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#86868b] mt-0.5">Right</span>
              </button>
            </div>

            {/* Desktop Center Tip */}
            <div className="hidden lg:flex flex-col items-center pointer-events-none pb-2 text-[11px] text-[#86868b] font-mono">
              <span className="bg-black/50 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                Desktop: A/D or Arrow keys • Space to Fire • Swipe/Tap on Mobile
              </span>
            </div>

            {/* Right Thumb Cluster: Big Glowing Blast Cannon Button */}
            <div className="pointer-events-auto flex items-center">
              <button
                type="button"
                onClick={fireLaser}
                onTouchStart={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  fireLaser()
                }}
                aria-label="Fire Plasma Lasers"
                className="flex flex-col items-center justify-center h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#2997ff] hover:opacity-95 active:scale-90 active:from-[#005bb5] active:to-[#0071e3] border-2 border-white/40 shadow-[0_0_28px_rgba(41,151,255,0.7)] backdrop-blur-2xl transition touch-none"
              >
                <Crosshair size={24} className="text-white" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-white mt-0.5">
                  FIRE
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* --- HUD HEADER BAR (INTEGRATED COMPACT TIMELINE - ZERO CENTER OBSTRUCTION) --- */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3.5 sm:p-4 md:px-7 bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-xs safe-top">
        {/* Left: Exit & Destination Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onExit}
            className="apple-pill-btn flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.08] hover:bg-white/[0.16] px-3 py-1.5 text-xs font-medium text-white transition"
          >
            <ArrowLeft size={13} /> <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: selectedPlanet.color }}
            />
            <span className="font-semibold text-xs text-white tracking-tight">
              {selectedPlanet.name.toUpperCase()}
            </span>
            <span className="text-[9px] font-mono text-[#86868b] uppercase border border-white/10 rounded-full px-1.5 py-0.2">
              {diffConfig.name}
            </span>
          </div>
        </div>

        {/* Center: Slim Integrated Flight Capsule */}
        {phase === 'playing' && (
          <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-white/[0.12] bg-[#161617]/75 px-3 sm:px-4 py-1 sm:py-1.5 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-1 font-mono text-xs font-semibold text-[#2997ff]">
              <Clock size={12} className="text-[#ff9f0a]" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="w-16 sm:w-24 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-[#0071e3] to-[#34c759]"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                style={{ left: '33.33%' }}
                title="Checkpoint Alpha"
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                style={{ left: '66.66%' }}
                title="Checkpoint Bravo"
              />
            </div>
            <span className="text-white/20">|</span>
            <span className="font-mono text-xs font-bold text-white/90">
              {Math.round(progressPercent)}%
            </span>
          </div>
        )}

        {/* Right: Lives Counter & Score */}
        {phase === 'playing' ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Lives Indicator */}
            <div className="flex items-center gap-1 rounded-full border border-white/[0.1] bg-[#161617]/80 px-2.5 sm:px-3 py-1 backdrop-blur-xl">
              {[1, 2, 3].map((heartIndex) => (
                <Heart
                  key={heartIndex}
                  size={13}
                  className={
                    heartIndex <= lives
                      ? 'fill-red-500 text-red-500 animate-pulse'
                      : 'text-white/20'
                  }
                />
              ))}
            </div>

            {/* Combat Score */}
            <div className="rounded-full border border-white/[0.1] bg-[#161617]/80 px-2.5 sm:px-3.5 py-1 backdrop-blur-xl font-mono text-xs font-semibold text-[#2997ff]">
              {score}
            </div>
          </div>
        ) : (
          <div className="text-[10px] font-mono text-[#86868b]">LIGHT SPEED 1.0c</div>
        )}
      </header>

      {/* --- PHASE 3: GAMEOVER SCREEN (AFTER 3 LIVES LOST) --- */}
      {phase === 'gameover' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-red-500/30 shadow-2xl text-center space-y-5">
            <div className="flex justify-center">
              <div className="p-3.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                <Shield size={36} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-widest text-red-400 uppercase">
                Vessel Destroyed • All 3 Lives Depleted
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold apple-headline text-white">
                GAME OVER
              </h2>
              <p className="mt-1.5 text-xs text-[#86868b]">
                Spacecraft hull compromised in light-speed transit vector to {selectedPlanet.name}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-3 border-y border-white/[0.08] text-left">
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Flight Time</p>
                <p className="text-base font-bold text-white font-mono">{formatTime(elapsedSeconds)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Score</p>
                <p className="text-base font-bold text-[#2997ff] font-mono">{score}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Aliens Destroyed</p>
                <p className="text-base font-bold text-purple-400 font-mono">{aliensDestroyed}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Asteroids Smashed</p>
                <p className="text-base font-bold text-slate-300 font-mono">{asteroidsDestroyed}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-[#86868b] uppercase">Slingshot Combos</p>
                <p className="text-base font-bold text-amber-400 font-mono">{slingshotCombos}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={restartFromBeginning}
                className="apple-pill-btn flex-1 bg-[#0071e3] hover:bg-[#0077ed] py-3 text-xs font-medium text-white shadow-[0_4px_16px_rgba(0,113,227,0.4)] flex items-center justify-center gap-2"
              >
                <RotateCcw size={15} /> Return to Flight Briefing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PHASE 4: VICTORY SCREEN (TARGET ORBIT REACHED) --- */}
      {phase === 'victory' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-emerald-500/30 shadow-2xl text-center space-y-5">
            <div className="flex justify-center">
              <div className="p-3.5 rounded-full bg-emerald-500/10 text-[#34c759] border border-emerald-500/20">
                <Award size={36} />
              </div>
            </div>

            <div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-[#34c759] uppercase tracking-wider">
                {selectedPlanet.name.toUpperCase()} ORBIT ACHIEVED • {selectedDuration}s FLIGHT COMPLETE
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight apple-headline text-white">
                VICTORY! MISSION COMPLETE
              </h2>
              <p className="mt-1.5 text-xs text-[#86868b] leading-relaxed">
                You survived the {selectedDuration}-second light-speed transit on <strong>{diffConfig.name}</strong> mode, repelled hostile alien incursions, slingshotted meteorites, and safely entered {selectedPlanet.name} planetary orbit!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 py-3 border-y border-white/[0.08] text-left">
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Final Pilot Rank</p>
                <p className="text-lg font-bold text-[#34c759] font-mono">ACE PILOT (A+)</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Total Combat Score</p>
                <p className="text-lg font-bold text-[#2997ff] font-mono">{score + 1500}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Hostiles Destroyed</p>
                <p className="text-base font-semibold text-white font-mono">{aliensDestroyed} Alien Ships</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Asteroids Smashed</p>
                <p className="text-base font-semibold text-slate-300 font-mono">{asteroidsDestroyed}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-[#86868b] uppercase">Meteor Combos</p>
                <p className="text-base font-semibold text-amber-400 font-mono">{slingshotCombos} Slingshots</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={restartFromBeginning}
                className="apple-pill-btn flex-1 bg-[#0071e3] hover:bg-[#0077ed] py-3 text-xs font-medium text-white shadow-[0_4px_16px_rgba(0,113,227,0.4)] flex items-center justify-center gap-2"
              >
                <RotateCcw size={15} /> Fly Another Mission
              </button>
              <button
                type="button"
                onClick={onExit}
                className="apple-pill-btn flex-1 border border-white/[0.12] bg-white/[0.08] hover:bg-white/[0.16] py-3 text-xs font-medium text-white"
              >
                Back to Spacecraft Designer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
