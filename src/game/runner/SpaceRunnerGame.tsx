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
} from 'lucide-react'
import { Group, Mesh, MathUtils } from 'three'
import { audioTelemetry } from '../../utils/audioTelemetry'

type GamePhase = 'launching' | 'playing' | 'gameover' | 'victory'

interface LaserBolt {
  id: number
  x: number
  z: number
}

interface Obstacle {
  id: number
  type: 'asteroid' | 'alien'
  lane: number // -1 = Left, 0 = Center, 1 = Right
  z: number
  speed: number
  health: number
  rotationSpeed: number
}

const LANES = [-3.2, 0, 3.2]

// --- 3D SCENE COMPONENTS ---

// Player's Spacecraft with Animated Thrusters
function PlayerShip({
  targetLane,
  isRolling,
}: {
  targetLane: number
  isRolling: number
}) {
  const groupRef = useRef<Group>(null)
  const currentX = useRef(LANES[targetLane + 1] || 0)
  const targetX = LANES[targetLane + 1] || 0

  useFrame((_, delta) => {
    if (!groupRef.current) return
    currentX.current = MathUtils.damp(currentX.current, targetX, 14, delta)
    groupRef.current.position.x = currentX.current

    // Bank / roll ship when changing lanes
    const targetRoll = (targetX - currentX.current) * -0.22 + isRolling * 0.05
    groupRef.current.rotation.z = MathUtils.damp(
      groupRef.current.rotation.z,
      targetRoll,
      12,
      delta,
    )
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.005) * 0.04
  })

  return (
    <group ref={groupRef} position={[0, -0.4, 0]}>
      {/* Sleek Fighter Fuselage */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.55, 2.2, 5]} />
        <meshStandardMaterial color="#f0f2f5" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Cockpit Canopy */}
      <mesh position={[0, 0.22, -0.15]}>
        <sphereGeometry args={[0.26, 12, 12]} />
        <meshStandardMaterial
          color="#2997ff"
          emissive="#0071e3"
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Delta Wings */}
      <mesh position={[0, -0.05, 0.4]}>
        <boxGeometry args={[2.4, 0.06, 0.9]} />
        <meshStandardMaterial color="#1c1c1e" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Left Laser Cannon */}
      <mesh position={[-1.1, -0.02, 0.2]}>
        <cylinderGeometry args={[0.04, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#2997ff" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Right Laser Cannon */}
      <mesh position={[1.1, -0.02, 0.2]}>
        <cylinderGeometry args={[0.04, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#2997ff" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Dual Thruster Glow Engines */}
      <mesh position={[-0.3, -0.05, 1.1]}>
        <cylinderGeometry args={[0.12, 0.16, 0.35, 12]} />
        <meshStandardMaterial color="#0071e3" emissive="#2997ff" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.3, -0.05, 1.1]}>
        <cylinderGeometry args={[0.12, 0.16, 0.35, 12]} />
        <meshStandardMaterial color="#0071e3" emissive="#2997ff" emissiveIntensity={1.2} />
      </mesh>
    </group>
  )
}

// Hyperdrive Streaking Warp Stars
function WarpSpeedStars({ isWarping }: { isWarping: boolean }) {
  const count = 350
  const stars = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 35,
      y: (Math.random() - 0.5) * 22,
      z: -Math.random() * 120,
      length: Math.random() * 3 + 1.5,
    }))
  }, [])

  const starsRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!starsRef.current) return
    const speed = isWarping ? 75 : 12
    starsRef.current.children.forEach((child) => {
      child.position.z += speed * delta
      if (child.position.z > 15) {
        child.position.z = -110
      }
    })
  })

  return (
    <group ref={starsRef}>
      {stars.map((star, i) => (
        <mesh key={i} position={[star.x, star.y, star.z]}>
          <boxGeometry args={[0.06, 0.06, isWarping ? star.length * 2.8 : 0.35]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#2997ff' : '#ffffff'} />
        </mesh>
      ))}
    </group>
  )
}

// 3D Asteroid Rock
function AsteroidMesh({
  obstacle,
}: {
  obstacle: Obstacle
}) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += obstacle.rotationSpeed * delta
      meshRef.current.rotation.y += obstacle.rotationSpeed * 0.8 * delta
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[LANES[obstacle.lane + 1], 0, obstacle.z]}
    >
      <dodecahedronGeometry args={[0.75, 1]} />
      <meshStandardMaterial
        color="#8e8e93"
        roughness={0.88}
        metalness={0.2}
      />
    </mesh>
  )
}

// 3D Alien Fighter Vessel
function AlienFighterMesh({
  obstacle,
}: {
  obstacle: Obstacle
}) {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(Date.now() * 0.008) * 0.25
    }
  })

  return (
    <group
      ref={groupRef}
      position={[LANES[obstacle.lane + 1], 0, obstacle.z]}
    >
      {/* Alien Saucer / Wing */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.4, 0.22, 6]} />
        <meshStandardMaterial
          color="#300a4d"
          emissive="#7822c9"
          emissiveIntensity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Alien Eye / Core */}
      <mesh position={[0, 0.15, -0.1]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="#ff2d55"
          emissive="#ff375f"
          emissiveIntensity={1.8}
        />
      </mesh>
    </group>
  )
}

// Laser Bolts
function LaserBoltMesh({ bolt }: { bolt: LaserBolt }) {
  return (
    <group position={[bolt.x, -0.4, bolt.z]}>
      <mesh position={[-1.1, 0, 0]}>
        <boxGeometry args={[0.07, 0.07, 1.4]} />
        <meshBasicMaterial color="#30b0c7" />
      </mesh>
      <mesh position={[1.1, 0, 0]}>
        <boxGeometry args={[0.07, 0.07, 1.4]} />
        <meshBasicMaterial color="#30b0c7" />
      </mesh>
    </group>
  )
}

// Destination Target Planet (The Moon or Mars at 100%)
function DestinationPlanet({ progress }: { progress: number }) {
  const zPos = -120 + progress * 0.95
  const s = 3.5 + progress * 0.08

  return (
    <group position={[0, 0, zPos]} scale={[s, s, s]}>
      {/* Red Planet Mars / Moon */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#ff6b4a"
          roughness={0.75}
          metalness={0.1}
        />
      </mesh>

      {/* Atmospheric Glow */}
      <mesh scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color="#ff9f0a"
          transparent
          opacity={0.25}
          emissive="#ff6b4a"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}

// 3D Cinematic Launch Scene
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

// --- MAIN RUNNER COMPONENT ---
export default function SpaceRunnerGame({
  onExit,
}: {
  onExit: () => void
}) {
  const [phase, setPhase] = useState<GamePhase>('launching')
  const [launchCountdown, setLaunchCountdown] = useState(3)
  const [launchAltitude, setLaunchAltitude] = useState(0)

  // Game gameplay states
  const [targetLane, setTargetLane] = useState(0) // -1, 0, 1
  const [lives, setLives] = useState(3)
  const [checkpoint, setCheckpoint] = useState(0) // 0%, 33%, 66%
  const [distance, setDistance] = useState(0) // 0 to 100%
  const [score, setScore] = useState(0)
  const [aliensDestroyed, setAliensDestroyed] = useState(0)
  const [asteroidsDestroyed, setAsteroidsDestroyed] = useState(0)
  const [flashDamage, setFlashDamage] = useState(false)
  const [checkpointNotification, setCheckpointNotification] = useState<string | null>(null)

  // Entities
  const [lasers, setLasers] = useState<LaserBolt[]>([])
  const [obstacles, setObstacles] = useState<Obstacle[]>([])

  const nextId = useRef(1)
  const lastSpawn = useRef(0)
  const rolling = useRef(0)

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

  // Skip launch straight to light speed
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

  // 3. Laser Gun Shooting
  const fireLaser = useCallback(() => {
    if (phase !== 'playing') return
    audioTelemetry.playLaserShot()
    const boltX = LANES[targetLane + 1]
    setLasers((prev) => [
      ...prev,
      { id: nextId.current++, x: boltX, z: -1.2 },
    ])
  }, [phase, targetLane])

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

  // 4. Game Loop: Movement, Spawning, Collisions, Distance
  useEffect(() => {
    if (phase !== 'playing') return

    const loop = setInterval(() => {
      // Advance distance progress toward 100%
      setDistance((dist) => {
        const nextDist = dist + 0.35

        // Checkpoint 1 (Alpha) at 33%
        if (dist < 33 && nextDist >= 33) {
          setCheckpoint(33)
          setCheckpointNotification('CHECKPOINT ALPHA REACHED (33%)')
          audioTelemetry.playCheckpoint()
          setTimeout(() => setCheckpointNotification(null), 3000)
        }

        // Checkpoint 2 (Bravo) at 66%
        if (dist < 66 && nextDist >= 66) {
          setCheckpoint(66)
          setCheckpointNotification('CHECKPOINT BRAVO REACHED (66%)')
          audioTelemetry.playCheckpoint()
          setTimeout(() => setCheckpointNotification(null), 3000)
        }

        // 100% Victory!
        if (nextDist >= 100) {
          setPhase('victory')
          audioTelemetry.playMissionSuccess()
          return 100
        }
        return nextDist
      })

      // Spawn Obstacles (Asteroids & Alien Ships)
      const now = Date.now()
      if (now - lastSpawn.current > 1200) {
        lastSpawn.current = now
        const isAlien = Math.random() > 0.45
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)]

        setObstacles((prev) => [
          ...prev,
          {
            id: nextId.current++,
            type: isAlien ? 'alien' : 'asteroid',
            lane,
            z: -95,
            speed: isAlien ? 1.6 : 1.3,
            health: isAlien ? 2 : 1,
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

      // Move Obstacles backward toward player & test collisions
      setObstacles((prev) => {
        const updated: Obstacle[] = []

        prev.forEach((obstacle) => {
          const nextZ = obstacle.z + obstacle.speed * 1.5

          // Test laser hits
          let destroyedByLaser = false
          setLasers((currentLasers) => {
            const hitIndex = currentLasers.findIndex(
              (bolt) =>
                Math.abs(bolt.x - LANES[obstacle.lane + 1]) < 1.1 &&
                Math.abs(bolt.z - obstacle.z) < 2.5,
            )

            if (hitIndex !== -1) {
              destroyedByLaser = true
              audioTelemetry.playExplosion()

              if (obstacle.type === 'alien') {
                setAliensDestroyed((c) => c + 1)
                setScore((s) => s + 350)
              } else {
                setAsteroidsDestroyed((c) => c + 1)
                setScore((s) => s + 150)
              }
              // Remove consumed laser
              return currentLasers.filter((_, idx) => idx !== hitIndex)
            }
            return currentLasers
          })

          if (destroyedByLaser) return

          // Test player collision (at z ≈ 0)
          if (
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
                // Respawn at last checkpoint!
                setDistance(checkpoint)
                setCheckpointNotification(`RESPAWNING AT CHECKPOINT (${checkpoint}%)`)
                setTimeout(() => setCheckpointNotification(null), 2500)
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
    }, 35)

    return () => clearInterval(loop)
  }, [phase, targetLane, checkpoint])

  // Restart from beginning after gameover
  const restartFromBeginning = () => {
    setLives(3)
    setCheckpoint(0)
    setDistance(0)
    setScore(0)
    setAliensDestroyed(0)
    setAsteroidsDestroyed(0)
    setObstacles([])
    setLasers([])
    setLaunchCountdown(3)
    setLaunchAltitude(0)
    setPhase('launching')
  }

  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen bg-[#000000] overflow-hidden select-none font-sans text-white">
      {/* Red screen flash when taking damage */}
      {flashDamage && (
        <div className="pointer-events-none absolute inset-0 z-50 bg-red-600/35 transition-opacity" />
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 2.2, 5.5], fov: 60 }}
        className="absolute inset-0 z-0"
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 15]} intensity={1.5} />
        <pointLight position={[0, 0, 0]} intensity={1.2} color="#2997ff" />

        {phase === 'launching' ? (
          <>
            <LaunchRocket altitude={launchAltitude} />
            <ambientLight intensity={0.6} />
          </>
        ) : (
          <>
            <WarpSpeedStars isWarping={phase === 'playing'} />
            <PlayerShip targetLane={targetLane} isRolling={rolling.current} />

            {/* Lasers */}
            {lasers.map((bolt) => (
              <LaserBoltMesh key={bolt.id} bolt={bolt} />
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
            <DestinationPlanet progress={distance} />
          </>
        )}
      </Canvas>

      {/* --- HUD OVERLAYS --- */}

      {/* Top Header Bar */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-5 md:px-8 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onExit}
            className="apple-pill-btn flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] hover:bg-white/[0.16] px-4 py-2 text-xs font-medium text-white transition"
          >
            <ArrowLeft size={14} /> Back to Operations
          </button>

          <div>
            <h1 className="font-semibold text-sm md:text-base tracking-tight apple-headline flex items-center gap-2">
              <Rocket size={16} className="text-[#2997ff]" />
              DEEP SPACE ODYSSEY
            </h1>
            <p className="text-[10px] tracking-[0.2em] text-[#86868b] uppercase">
              Light-Speed Planetary Intercept
            </p>
          </div>
        </div>

        {/* Lives Counter & Score */}
        {phase === 'playing' && (
          <div className="flex items-center gap-4">
            {/* Lives Indicator */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#161617]/80 px-4 py-1.5 backdrop-blur-xl">
              <span className="text-[10px] text-[#86868b] uppercase tracking-wider mr-1">Lives:</span>
              {[1, 2, 3].map((heartIndex) => (
                <Heart
                  key={heartIndex}
                  size={16}
                  className={
                    heartIndex <= lives
                      ? 'fill-red-500 text-red-500 animate-pulse'
                      : 'text-white/20'
                  }
                />
              ))}
            </div>

            {/* Combat Score */}
            <div className="rounded-full border border-white/[0.1] bg-[#161617]/80 px-4 py-1.5 backdrop-blur-xl font-mono text-sm text-[#2997ff]">
              SCORE: <span className="text-white font-bold">{score}</span>
            </div>
          </div>
        )}
      </header>

      {/* Checkpoint Notification Banner */}
      {checkpointNotification && (
        <div className="absolute top-20 inset-x-0 z-30 flex justify-center">
          <div className="mission-event-toast rounded-2xl border border-[#2997ff]/40 bg-[#161617]/95 px-6 py-3 text-center shadow-2xl backdrop-blur-2xl">
            <p className="text-xs font-semibold tracking-wider text-[#2997ff] uppercase">
              {checkpointNotification}
            </p>
          </div>
        </div>
      )}

      {/* --- PHASE 1: LAUNCHING SCREEN --- */}
      {phase === 'launching' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-xs">
          <div className="apple-glass rounded-3xl p-8 max-w-md w-full border border-white/[0.1] shadow-2xl space-y-6">
            <div>
              <span className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1 text-xs text-[#2997ff] font-medium uppercase tracking-widest">
                Cape Canaveral Launchpad 39A
              </span>
              <h2 className="mt-3 text-4xl font-bold tracking-tight apple-headline">
                MISSION LAUNCH
              </h2>
              <p className="mt-2 text-xs text-[#86868b] leading-relaxed">
                T-minus ignition. Satellite is deploying into light-speed transit vector to target planetary destination.
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

      {/* --- PHASE 2: PLAYING OVERLAY (PROGRESS & ON-SCREEN CONTROLS) --- */}
      {phase === 'playing' && (
        <>
          {/* Distance & Planet Progress Bar (Top Center) */}
          <div className="absolute top-20 inset-x-0 z-20 flex justify-center px-4">
            <div className="w-full max-w-xl rounded-2xl border border-white/[0.1] bg-[#161617]/85 p-3.5 backdrop-blur-2xl shadow-2xl">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="text-[#86868b] flex items-center gap-1.5">
                  <Rocket size={13} className="text-[#2997ff]" /> Earth Vector
                </span>
                <span className="font-mono text-[#2997ff] font-semibold">
                  {Math.round(distance)}% • LIGHT SPEED (1.0c)
                </span>
                <span className="text-[#ff9f0a] flex items-center gap-1.5">
                  Target Planet 🪐
                </span>
              </div>

              {/* Progress bar with Checkpoint notches */}
              <div className="relative h-2 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2997ff] via-[#0071e3] to-[#ff9f0a] transition-all duration-150"
                  style={{ width: `${distance}%` }}
                />
              </div>

              <div className="flex justify-between text-[9px] text-[#86868b] mt-1.5 px-0.5">
                <span>Launch</span>
                <span>CP Alpha (33%)</span>
                <span>CP Bravo (66%)</span>
                <span>Target Orbit</span>
              </div>
            </div>
          </div>

          {/* Bottom On-Screen Controls for Laptop Trackpad / Touch / Keyboard */}
          <footer className="absolute bottom-6 inset-x-0 z-20 flex flex-col items-center gap-3 px-6 pointer-events-auto">
            <div className="text-[11px] text-[#86868b] flex items-center gap-4 bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/[0.08]">
              <span>Controls: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">A / ←</kbd> Left</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">D / →</kbd> Right</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">Space</kbd> Fire Lasers</span>
            </div>

            {/* Mobile / Clickable Controller Buttons */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={moveLeft}
                className="apple-pill-btn h-14 w-16 rounded-2xl border border-white/[0.12] bg-[#161617]/80 hover:bg-white/[0.15] active:scale-95 text-white shadow-xl backdrop-blur-2xl flex items-center justify-center"
              >
                <ArrowLeft size={22} />
              </button>

              <button
                type="button"
                onClick={fireLaser}
                className="apple-pill-btn h-14 px-8 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 text-white font-semibold text-sm shadow-[0_4px_20px_rgba(0,113,227,0.45)] flex items-center gap-2"
              >
                <Flame size={18} className="text-amber-300" />
                FIRE LASERS
              </button>

              <button
                type="button"
                onClick={moveRight}
                className="apple-pill-btn h-14 w-16 rounded-2xl border border-white/[0.12] bg-[#161617]/80 hover:bg-white/[0.15] active:scale-95 text-white shadow-xl backdrop-blur-2xl flex items-center justify-center"
              >
                <ArrowRight size={22} />
              </button>
            </div>
          </footer>
        </>
      )}

      {/* --- PHASE 3: GAMEOVER SCREEN --- */}
      {phase === 'gameover' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-8 max-w-md w-full border border-red-500/20 shadow-2xl text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                <Shield size={36} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-widest text-red-400 uppercase">
                Vessel Destroyed • All Lives Depleted
              </p>
              <h2 className="mt-1 text-3xl font-bold apple-headline text-white">
                GAME OVER
              </h2>
              <p className="mt-2 text-xs text-[#86868b]">
                Spacecraft hull compromised in light-speed transit corridor.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/[0.08] text-left">
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Distance</p>
                <p className="text-lg font-bold text-white font-mono">{Math.round(distance)}%</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Score</p>
                <p className="text-lg font-bold text-[#2997ff] font-mono">{score}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Aliens Destroyed</p>
                <p className="text-lg font-bold text-purple-400 font-mono">{aliensDestroyed}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Asteroids Shattered</p>
                <p className="text-lg font-bold text-amber-400 font-mono">{asteroidsDestroyed}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={restartFromBeginning}
                className="apple-pill-btn flex-1 bg-[#0071e3] hover:bg-[#0077ed] py-3 text-xs font-medium text-white shadow-[0_4px_16px_rgba(0,113,227,0.4)] flex items-center justify-center gap-2"
              >
                <RotateCcw size={15} /> Retry from Launchpad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PHASE 4: VICTORY SCREEN --- */}
      {phase === 'victory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="apple-glass rounded-3xl p-8 max-w-lg w-full border border-emerald-500/30 shadow-2xl text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-emerald-500/10 text-[#34c759] border border-emerald-500/20">
                <Award size={40} />
              </div>
            </div>

            <div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-semibold text-[#34c759] uppercase tracking-wider">
                Target Planetary Orbit Achieved
              </span>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight apple-headline text-white">
                VICTORY! MISSION COMPLETE
              </h2>
              <p className="mt-2 text-xs text-[#86868b] leading-relaxed">
                You successfully navigated through the asteroid belt, repelled hostile alien incursions at light speed, and established planetary orbit!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4 border-y border-white/[0.08] text-left">
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Final Rank</p>
                <p className="text-xl font-bold text-[#34c759] font-mono">ACE PILOT (A+)</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Total Combat Score</p>
                <p className="text-xl font-bold text-[#2997ff] font-mono">{score + 1000}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Hostiles Destroyed</p>
                <p className="text-base font-semibold text-white font-mono">{aliensDestroyed} Alien Ships</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868b] uppercase">Obstacles Cleared</p>
                <p className="text-base font-semibold text-white font-mono">{asteroidsDestroyed} Asteroids</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={restartFromBeginning}
                className="apple-pill-btn flex-1 bg-[#0071e3] hover:bg-[#0077ed] py-3 text-xs font-medium text-white shadow-[0_4px_16px_rgba(0,113,227,0.4)] flex items-center justify-center gap-2"
              >
                <RotateCcw size={15} /> Play Again
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
