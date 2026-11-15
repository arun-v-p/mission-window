import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Sparkles } from '@react-three/drei'
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
  Sparkles as SparklesIcon,
  CheckCircle,
  Smartphone,
  Crosshair,
  Share2,
  Copy,
  ExternalLink,
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

// 1. Futuristic 3-Lane Holographic Vector Speedway (High-Tech Space Highway)
function SpaceRunwayLanes({ currentLane }: { currentLane: number }) {
  const gridRef = useRef<Group>(null)
  const pylonRef = useRef<Group>(null)

  useFrame((_, delta) => {
    // Fast scrolling speed chevrons and grid lines
    if (gridRef.current) {
      gridRef.current.children.forEach((child) => {
        child.position.z += 58 * delta
        if (child.position.z > 16) {
          child.position.z -= 120
        }
      })
    }
    // High-speed shoulder energy pylons for sensational parallax
    if (pylonRef.current) {
      pylonRef.current.children.forEach((child) => {
        child.position.z += 58 * delta
        if (child.position.z > 16) {
          child.position.z -= 120
        }
      })
    }
  })

  return (
    <group position={[0, -1.05, 0]}>
      {/* 4 Glowing Cybernetic Vector Rails */}
      {[-4.8, -1.6, 1.6, 4.8].map((x, i) => (
        <group key={i} position={[x, 0, -45]}>
          {/* Main Neon Guideway Beam */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.08, 130]} />
            <meshBasicMaterial color="#00f2fe" transparent opacity={0.65} />
          </mesh>
          {/* Outer Energy Halo */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[0.26, 130]} />
            <meshBasicMaterial color="#0071e3" transparent opacity={0.25} />
          </mesh>
        </group>
      ))}

      {/* Cyber Grid Speed Floor */}
      <mesh position={[0, -0.04, -45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.6, 130]} />
        <meshStandardMaterial
          color="#060913"
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Dynamic Active Lane Glowing Under-Vector */}
      <mesh
        position={[LANES[currentLane + 1] || 0, 0.015, -14]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[2.9, 36]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.18} />
      </mesh>

      {/* Rushing Vector Chevrons along lanes */}
      <group ref={gridRef}>
        {Array.from({ length: 14 }).map((_, i) => (
          <group key={i} position={[0, 0.02, -i * 9]}>
            {/* Center chevron marker */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[8.8, 0.16]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
            </mesh>
            {/* Lane Center Arrows */}
            {LANES.map((lx, li) => (
              <mesh key={li} position={[lx, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.9, 0.5]} />
                <meshBasicMaterial color="#2997ff" transparent opacity={0.25} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* High-Tech Shoulder Energy Pylons (Parallax speed markers) */}
      <group ref={pylonRef}>
        {Array.from({ length: 8 }).map((_, i) => (
          <group key={i} position={[0, 0, -i * 15]}>
            {/* Left Energy Pylon */}
            <mesh position={[-5.4, 0.6, 0]}>
              <boxGeometry args={[0.12, 1.2, 0.12]} />
              <meshStandardMaterial color="#00f2fe" emissive="#0071e3" emissiveIntensity={1.8} />
            </mesh>
            <mesh position={[-5.4, 1.25, 0]}>
              <sphereGeometry args={[0.14, 8, 8]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            {/* Right Energy Pylon */}
            <mesh position={[5.4, 0.6, 0]}>
              <boxGeometry args={[0.12, 1.2, 0.12]} />
              <meshStandardMaterial color="#00f2fe" emissive="#0071e3" emissiveIntensity={1.8} />
            </mesh>
            <mesh position={[5.4, 1.25, 0]}>
              <sphereGeometry args={[0.14, 8, 8]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

// 2. Volumetric Deep-Space Nebula Clouds & Cosmic Starfield
function CosmicNebula() {
  return (
    <group position={[0, 0, -110]}>
      {/* Drei Dense Deep Space Stars */}
      <Stars radius={140} depth={70} count={7500} factor={4} saturation={0.8} fade speed={1.8} />

      {/* Floating Cosmic Dust Particles */}
      <Sparkles count={140} scale={[30, 20, 70]} size={4} speed={0.9} opacity={0.7} color="#38bdf8" />
      <Sparkles count={70} scale={[24, 16, 50]} size={5} speed={1.3} opacity={0.6} color="#fbbf24" />

      {/* 4-Tier Volumetric Nebula Dust Clouds */}
      <mesh position={[-32, 16, -15]}>
        <sphereGeometry args={[26, 16, 16]} />
        <meshBasicMaterial color="#4c1d95" transparent opacity={0.16} />
      </mesh>
      <mesh position={[34, -14, -25]}>
        <sphereGeometry args={[28, 16, 16]} />
        <meshBasicMaterial color="#0369a1" transparent opacity={0.18} />
      </mesh>
      <mesh position={[-15, -20, -35]}>
        <sphereGeometry args={[24, 16, 16]} />
        <meshBasicMaterial color="#831843" transparent opacity={0.14} />
      </mesh>
      <mesh position={[0, 32, -45]}>
        <sphereGeometry args={[34, 16, 16]} />
        <meshBasicMaterial color="#78350f" transparent opacity={0.12} />
      </mesh>
    </group>
  )
}

// 3. Holographic Targeting Crosshair in Active Lane
function TargetingReticle({ lane }: { lane: number }) {
  const meshRef = useRef<Group>(null)
  const innerRef = useRef<Group>(null)
  const targetX = LANES[lane + 1] || 0
  const currentX = useRef(targetX)

  useFrame((_, delta) => {
    if (meshRef.current) {
      currentX.current = MathUtils.damp(currentX.current, targetX, 14, delta)
      meshRef.current.position.x = currentX.current
      meshRef.current.rotation.z += 1.6 * delta
    }
    if (innerRef.current) {
      innerRef.current.rotation.z -= 2.4 * delta
    }
  })

  return (
    <group ref={meshRef} position={[targetX, -0.15, -13]}>
      {/* Outer Tactical Ring */}
      <mesh>
        <ringGeometry args={[0.5, 0.56, 32]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.5} />
      </mesh>
      {/* Inner Counter-Rotating Bracket */}
      <group ref={innerRef}>
        <mesh>
          <ringGeometry args={[0.3, 0.35, 4]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
        </mesh>
      </group>
      {/* Cardinal Ticks */}
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.16, 0.02, 0.02]} />
          <meshBasicMaterial color="#00f2fe" transparent opacity={0.75} />
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
        const s = 0.5 + age * 3.6
        ringRef.current.scale.set(s, s, 1)
        const mat = ringRef.current.material as any
        if (mat) mat.opacity = Math.max(0, 1 - age)
      }
    }
  })

  return (
    <group position={[shockwave.x, shockwave.y, shockwave.z]}>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.4, 0.95, 32]} />
        <meshBasicMaterial
          color={shockwave.color}
          transparent
          opacity={1}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}

// 5. Player's AAA Stealth Interceptor Starfighter (Aerospace Studio Quality)
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
  const recoilRef = useRef(0)
  const currentX = useRef(LANES[targetLane + 1] || 0)
  const targetX = LANES[targetLane + 1] || 0

  useFrame((_, delta) => {
    if (!groupRef.current) return
    currentX.current = MathUtils.damp(currentX.current, targetX, 15, delta)
    groupRef.current.position.x = currentX.current

    // Realistic banking roll when changing lanes
    const targetRoll = (targetX - currentX.current) * -0.28 + isRolling * 0.06
    groupRef.current.rotation.z = MathUtils.damp(
      groupRef.current.rotation.z,
      targetRoll,
      12,
      delta,
    )

    // Weapon firing recoil kickback along Z axis
    if (isFiring) {
      recoilRef.current = 0.12
    }
    recoilRef.current = MathUtils.damp(recoilRef.current, 0, 18, delta)
    groupRef.current.position.z = recoilRef.current

    // Micro aerodynamic flight oscillation
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.005) * 0.035
    groupRef.current.position.y = -0.4 + Math.sin(Date.now() * 0.006) * 0.04

    // Dynamic triple-stage plasma flame pulsation
    if (thrustersRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.04) * 0.25 + Math.random() * 0.15
      thrustersRef.current.scale.set(1, 1, pulse)
    }

    // Shield rotation
    if (shieldRef.current && isShielded) {
      shieldRef.current.rotation.y += 2.0 * delta
      shieldRef.current.rotation.x += 1.4 * delta
    }
  })

  return (
    <group ref={groupRef} position={[0, -0.4, 0]}>
      {/* 1. Main Stealth Fuselage Body (Titanium Carbon Composite) */}
      <mesh position={[0, 0, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.55, 2.6, 7]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.94}
          roughness={0.12}
        />
      </mesh>

      {/* Chisel Stealth Nose Probe */}
      <mesh position={[0, 0, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 0.7, 5]} />
        <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* 2. Crystalline Sapphire Cockpit Canopy */}
      <mesh position={[0, 0.25, -0.1]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0071e3"
          emissiveIntensity={1.2}
          metalness={0.95}
          roughness={0.05}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Interior Cockpit Holo-HUD glow */}
      <mesh position={[0, 0.28, -0.22]} rotation={[Math.PI / 6, 0, 0]}>
        <planeGeometry args={[0.18, 0.08]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.9} />
      </mesh>

      {/* 3. Swept Delta Stealth Wings */}
      <mesh position={[0, -0.06, 0.42]}>
        <boxGeometry args={[2.7, 0.07, 1.1]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Luminous Wing Leading Edge Plasma Conduits */}
      <mesh position={[-0.8, -0.04, 0.15]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[1.1, 0.03, 0.04]} />
        <meshBasicMaterial color="#00f2fe" />
      </mesh>
      <mesh position={[0.8, -0.04, 0.15]} rotation={[0, -0.4, 0]}>
        <boxGeometry args={[1.1, 0.03, 0.04]} />
        <meshBasicMaterial color="#00f2fe" />
      </mesh>

      {/* Twin Angled Stealth Tail Fins */}
      <mesh position={[-0.65, 0.38, 0.75]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.06, 0.65, 0.55]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.65, 0.38, 0.75]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.06, 0.65, 0.55]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Wingtip Navigation LED Strobes */}
      {/* Port Red Beacon */}
      <mesh position={[-1.35, -0.04, 0.55]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={3.5} />
      </mesh>
      {/* Starboard Green Beacon */}
      <mesh position={[1.35, -0.04, 0.55]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color="#34c759" emissive="#34c759" emissiveIntensity={3.5} />
      </mesh>

      {/* 4. Heavy Dual Railgun Laser Cannons */}
      <mesh position={[-1.15, -0.03, 0.18]}>
        <cylinderGeometry args={[0.06, 0.07, 1.0, 12]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh position={[1.15, -0.03, 0.18]}>
        <cylinderGeometry args={[0.06, 0.07, 1.0, 12]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* Muzzle Flash Shockwave Flares when firing */}
      {isFiring && (
        <>
          <mesh position={[-1.15, -0.03, -0.45]}>
            <sphereGeometry args={[0.22, 10, 10]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[1.15, -0.03, -0.45]}>
            <sphereGeometry args={[0.22, 10, 10]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <pointLight position={[0, 0, -0.6]} intensity={3.5} distance={7} color="#00f2fe" />
        </>
      )}

      {/* 5. Twin Vector Thruster Combustion Chambers */}
      <mesh position={[-0.35, -0.05, 1.15]}>
        <cylinderGeometry args={[0.15, 0.2, 0.42, 16]} />
        <meshStandardMaterial color="#0071e3" emissive="#0071e3" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.35, -0.05, 1.15]}>
        <cylinderGeometry args={[0.15, 0.2, 0.42, 16]} />
        <meshStandardMaterial color="#0071e3" emissive="#0071e3" emissiveIntensity={1.5} />
      </mesh>

      {/* Triple-Stage Plasma Afterburner Plumes */}
      <group ref={thrustersRef}>
        {/* Inner White-Hot Core Flame */}
        <mesh position={[-0.35, -0.05, 1.65]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.9, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.35, -0.05, 1.65]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.9, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Middle Electric Cyan Plasma Cone */}
        <mesh position={[-0.35, -0.05, 1.85]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.16, 1.25, 14]} />
          <meshBasicMaterial color="#00f2fe" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0.35, -0.05, 1.85]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.16, 1.25, 14]} />
          <meshBasicMaterial color="#00f2fe" transparent opacity={0.85} />
        </mesh>

        {/* Outer Violet Magnetohydrodynamic Aura */}
        <mesh position={[-0.35, -0.05, 2.05]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.22, 1.6, 14]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.4} />
        </mesh>
        <mesh position={[0.35, -0.05, 2.05]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.22, 1.6, 14]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Wingtip Light-Speed Contrail Streamers */}
      <mesh position={[-1.35, -0.04, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 2.2]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.4} />
      </mesh>
      <mesh position={[1.35, -0.04, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 2.2]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.4} />
      </mesh>

      {/* 6. Holographic Geodesic Energy Shield */}
      {isShielded && (
        <mesh ref={shieldRef} position={[0, 0, 0]}>
          <sphereGeometry args={[1.85, 20, 20]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.5}
            transparent
            opacity={0.4}
            wireframe
          />
        </mesh>
      )}
    </group>
  )
}

// 6. Hyperdrive Streaking Warp Stars
function WarpSpeedStars({ isWarping }: { isWarping: boolean }) {
  const count = 420
  const stars = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 42,
      y: (Math.random() - 0.5) * 26,
      z: -Math.random() * 120,
      length: Math.random() * 3.5 + 2.0,
      color: Math.random() > 0.4 ? '#38bdf8' : Math.random() > 0.5 ? '#ffffff' : '#fbbf24',
    }))
  }, [])

  const starsRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!starsRef.current) return
    const speed = isWarping ? 88 : 16
    starsRef.current.children.forEach((child) => {
      child.position.z += speed * delta
      if (child.position.z > 16) {
        child.position.z = -115
      }
    })
  })

  return (
    <group ref={starsRef}>
      {stars.map((star, i) => (
        <mesh key={i} position={[star.x, star.y, star.z]}>
          <boxGeometry args={[0.065, 0.065, isWarping ? star.length * 3.2 : 0.4]} />
          <meshBasicMaterial color={star.color} />
        </mesh>
      ))}
    </group>
  )
}

// 7. Rugged 3D Tumbling Asteroid Rock with Molten Magma Cracks & Orbiting Shards
function AsteroidMesh({ obstacle }: { obstacle: Obstacle }) {
  const meshRef = useRef<Group>(null)
  const debrisRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += obstacle.rotationSpeed * delta
      meshRef.current.rotation.y += obstacle.rotationSpeed * 0.85 * delta
      meshRef.current.rotation.z += obstacle.rotationSpeed * 0.45 * delta
    }
    if (debrisRef.current) {
      debrisRef.current.rotation.y += 2.2 * delta
    }
  })

  const isDamaged = obstacle.health < obstacle.maxHealth

  return (
    <group ref={meshRef} position={[LANES[obstacle.lane + 1], 0, obstacle.z]}>
      {/* Main Asteroid Core Body */}
      <mesh>
        <dodecahedronGeometry args={[0.88, 1]} />
        <meshStandardMaterial
          color={isDamaged ? '#ef4444' : '#475569'}
          emissive={isDamaged ? '#b91c1c' : '#ea580c'}
          emissiveIntensity={isDamaged ? 1.0 : 0.3}
          roughness={0.88}
          metalness={0.3}
        />
      </mesh>

      {/* Incandescent Magma Fissure Veins */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <icosahedronGeometry args={[0.85, 0]} />
        <meshBasicMaterial
          color={isDamaged ? '#ff0033' : '#f97316'}
          wireframe
          transparent
          opacity={isDamaged ? 0.8 : 0.45}
        />
      </mesh>

      {/* Orbiting Satellite Rock Debris Shards */}
      <group ref={debrisRef}>
        {[
          [-1.15, 0.4, 0.2],
          [1.2, -0.35, -0.3],
          [0.1, 1.1, -0.4],
        ].map(([dx, dy, dz], i) => (
          <mesh key={i} position={[dx, dy, dz]}>
            <dodecahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// 8. Sinister Bio-Mechanical 3D Alien War Cruiser (Predator Menace)
function AlienFighterMesh({ obstacle }: { obstacle: Obstacle }) {
  const groupRef = useRef<Group>(null)
  const coreRef = useRef<Mesh>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(Date.now() * 0.008) * 0.28
      groupRef.current.position.y = Math.sin(Date.now() * 0.007) * 0.12
    }
    if (coreRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.014) * 0.32
      coreRef.current.scale.set(pulse, pulse, pulse)
    }
  })

  return (
    <group ref={groupRef} position={[LANES[obstacle.lane + 1], 0, obstacle.z]}>
      {/* Obsidian Bio-Mechanical Stealth Hull */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.05, 0.48, 0.28, 6]} />
        <meshStandardMaterial
          color="#150a24"
          emissive="#7e22ce"
          emissiveIntensity={0.65}
          metalness={0.92}
          roughness={0.18}
        />
      </mesh>

      {/* Forward Predator Attack Mandibles with Plasma Blades */}
      <mesh position={[-0.52, 0, -0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 0.95, 4]} />
        <meshStandardMaterial color="#090314" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0.52, 0, -0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 0.95, 4]} />
        <meshStandardMaterial color="#090314" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Pulsing Bio-Singularity Core Eye */}
      <mesh ref={coreRef} position={[0, 0.18, -0.15]}>
        <sphereGeometry args={[0.34, 18, 18]} />
        <meshStandardMaterial
          color="#ff0055"
          emissive="#ff0055"
          emissiveIntensity={2.8}
        />
      </mesh>

      {/* Menacing Red Laser Targeting Lock-On Ray */}
      <mesh position={[0, 0, -5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 10]} />
        <meshBasicMaterial color="#ff0055" transparent opacity={0.4} />
      </mesh>

      {/* Rear Anti-Matter Drive Exhausts */}
      <mesh position={[-0.32, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2.0} />
      </mesh>
      <mesh position={[0.32, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2.0} />
      </mesh>

      {/* Dreadnought Armor Pip Bars */}
      {obstacle.maxHealth > 1 && (
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[obstacle.health * 0.4, 0.08, 0.08]} />
          <meshBasicMaterial color="#ff0055" />
        </mesh>
      )}
    </group>
  )
}

// 9. Hyper-Velocity Dual Plasma Laser Bolts
function LaserBoltMesh({ bolt }: { bolt: LaserBolt }) {
  return (
    <group position={[bolt.x, -0.4, bolt.z]}>
      {/* Left Laser: Outer Cyan Envelope & Inner White Core */}
      <mesh position={[-1.15, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, 2.0]} />
        <meshBasicMaterial color="#00f2fe" />
      </mesh>
      <mesh position={[-1.15, 0, 0]}>
        <boxGeometry args={[0.05, 0.05, 1.8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Right Laser */}
      <mesh position={[1.15, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, 2.0]} />
        <meshBasicMaterial color="#00f2fe" />
      </mesh>
      <mesh position={[1.15, 0, 0]}>
        <boxGeometry args={[0.05, 0.05, 1.8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

// 10. Slingshot Kinetic Meteor Projectile
function MeteorShardMesh({ shard }: { shard: MeteorShard }) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 14 * delta
      meshRef.current.rotation.y += 18 * delta
    }
  })

  return (
    <group position={[LANES[shard.lane + 1], 0, shard.z]}>
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.54, 1]} />
        <meshStandardMaterial
          color="#ff7a00"
          emissive="#ff3b30"
          emissiveIntensity={2.5}
          roughness={0.3}
        />
      </mesh>
      {/* Flaming Outer Fireball Halo */}
      <mesh scale={[1.25, 1.25, 1.25]}>
        <sphereGeometry args={[0.54, 14, 14]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.45} />
      </mesh>
    </group>
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
  const s = 3.8 + progress * 0.08
  const planetRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (planetRef.current) {
      planetRef.current.rotation.y += 0.2 * delta
    }
  })

  return (
    <group ref={planetRef} position={[0, 0, zPos]} scale={[s, s, s]}>
      {/* Main Planetary Sphere */}
      <mesh>
        <sphereGeometry args={[1, 36, 36]} />
        <meshStandardMaterial
          color={planet.color}
          roughness={0.65}
          metalness={0.15}
          emissive={planet.emissive}
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Atmospheric Corona */}
      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[1, 26, 26]} />
        <meshStandardMaterial
          color={planet.glowColor}
          transparent
          opacity={0.35}
          emissive={planet.glowColor}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Saturnian Rings (if Titan/Saturn selected) */}
      {planet.hasRings && (
        <mesh rotation={[Math.PI / 3, 0.25, 0]}>
          <ringGeometry args={[1.35, 2.5, 48]} />
          <meshStandardMaterial
            color={planet.ringColor || '#d1b280'}
            side={DoubleSide}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}
    </group>
  )
}

// 12. Cape Canaveral Launchpad Heavy Rocket
function LaunchRocket({ altitude }: { altitude: number }) {
  return (
    <group position={[0, altitude - 2.5, -4]}>
      {/* Rocket Fuselage */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.38, 0.46, 4.8, 18]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.4} roughness={0.25} />
      </mesh>

      {/* NASA Blue Accent Band */}
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.35, 18]} />
        <meshStandardMaterial color="#0071e3" metalness={0.5} roughness={0.2} />
      </mesh>

      {/* Aerodynamic Nosecone */}
      <mesh position={[0, 4.4, 0]}>
        <coneGeometry args={[0.38, 1.3, 18]} />
        <meshStandardMaterial color="#0071e3" metalness={0.5} roughness={0.2} />
      </mesh>

      {/* Volumetric Rocket Flame Plume */}
      <mesh position={[0, -1.3, 0]}>
        <coneGeometry args={[0.5, 2.6, 14]} />
        <meshBasicMaterial color="#ff9f0a" />
      </mesh>
      <mesh position={[0, -1.9, 0]}>
        <coneGeometry args={[0.28, 1.8, 14]} />
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
  const [copiedPublicLink, setCopiedPublicLink] = useState(false)
  const publicLiveUrl = 'https://shaw-relevant-bulk-prot.trycloudflare.com'

  const handleCopyPublicUrl = () => {
    audioTelemetry.playClick()
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(publicLiveUrl)
    }
    setCopiedPublicLink(true)
    setTimeout(() => setCopiedPublicLink(false), 2500)
  }

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

      {/* 3D Canvas with High-Performance Anti-Aliasing and Studio Space Lighting */}
      <Canvas
        camera={{ position: [0, 2.8, 5.8], fov: 62 }}
        className="absolute inset-0 z-0"
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#020409']} />
        <ambientLight intensity={0.4} color="#0c1d36" />
        {/* Primary Stellar Sunlight with Specular Hull Highlights */}
        <directionalLight position={[14, 24, 18]} intensity={2.5} color="#ffffff" />
        {/* Dynamic Vector Runway Uplight */}
        <pointLight position={[0, -0.8, 1.5]} intensity={2.2} distance={8} color="#00f2fe" />
        {/* Planetary Approach Corona Glow */}
        <pointLight position={[0, 2, -60]} intensity={2.0} distance={100} color={selectedPlanet.glowColor} />
        {/* Critical Hull Breach Emergency Alarm Strobe */}
        {lives === 1 && (
          <pointLight position={[0, 1.5, 0]} intensity={3.5} distance={15} color="#ff0033" />
        )}

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

            {/* Public Live Launch Banner (Any Device Globally Can Play) */}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs backdrop-blur-xl">
              <div className="flex items-center gap-2.5 text-white">
                <div className="h-3 w-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                    <Share2 size={13} />
                    <span>Public Live URL (Play on Mobile or Share with Judges):</span>
                  </div>
                  <div className="font-mono text-white/90 text-[11px] mt-0.5 select-all break-all">
                    {publicLiveUrl}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyPublicUrl}
                  className="apple-pill-btn flex-1 sm:flex-none bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 px-3.5 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  {copiedPublicLink ? (
                    <>
                      <CheckCircle size={13} className="text-emerald-400" />
                      <span className="text-emerald-300">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
                <a
                  href={publicLiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-pill-btn bg-white/10 hover:bg-white/20 border border-white/20 text-white px-2.5 py-1.5 text-xs flex items-center justify-center"
                  title="Open live website in new tab"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
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
                <SparklesIcon size={13} className="text-[#ff9f0a]" />
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
