import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  FrontSide,
  Group,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
} from 'three'
import blueMarbleTextureUrl from '../../assets/nasa/blue-marble-2048.png'
import useReducedMotion from '../useReducedMotion'

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    float edge = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
    float glow = pow(edge, 3.2);
    gl_FragColor = vec4(0.16, 0.55, 1.0, glow * 0.72);
  }
`

const cloudVertexShader = `
  varying vec2 vCloudUv;

  void main() {
    vCloudUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const cloudFragmentShader = `
  uniform sampler2D uSurfaceMap;
  varying vec2 vCloudUv;

  void main() {
    vec3 surface = texture2D(uSurfaceMap, vCloudUv).rgb;
    float brightest = max(max(surface.r, surface.g), surface.b);
    float darkest = min(min(surface.r, surface.g), surface.b);
    float luminance = dot(surface, vec3(0.299, 0.587, 0.114));
    float saturation = brightest - darkest;
    float cloud = smoothstep(0.69, 0.94, luminance)
      * (1.0 - smoothstep(0.08, 0.34, saturation));
    float polarFade = smoothstep(0.0, 0.1, vCloudUv.y)
      * (1.0 - smoothstep(0.9, 1.0, vCloudUv.y));
    float opacity = smoothstep(0.12, 0.68, cloud) * polarFade * 0.26;
    gl_FragColor = vec4(vec3(0.84, 0.94, 1.0), opacity);
  }
`

function Earth() {
  const earthRef = useRef<Group>(null)
  const cloudRef = useRef<Group>(null)
  const surfaceTexture = useLoader(TextureLoader, blueMarbleTextureUrl)
  const reducedMotion = useReducedMotion()
  const atmosphereMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
      }),
    [],
  )
  const cloudMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uSurfaceMap: { value: surfaceTexture } },
        vertexShader: cloudVertexShader,
        fragmentShader: cloudFragmentShader,
        transparent: true,
        depthWrite: false,
        side: FrontSide,
      }),
    [surfaceTexture],
  )

  useFrame((_, delta) => {
    if (reducedMotion) return
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.018
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.021
  })

  useEffect(() => {
    surfaceTexture.colorSpace = SRGBColorSpace
    surfaceTexture.anisotropy = 4
  }, [surfaceTexture])

  return (
    <>
      <mesh>
        <sphereGeometry args={[1.29, 48, 36]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[1.2, 64, 48]} />
          <meshStandardMaterial
            map={surfaceTexture}
            roughness={0.92}
            metalness={0.02}
          />
        </mesh>
      </group>
      <group ref={cloudRef}>
        <mesh>
          <sphereGeometry args={[1.208, 48, 36]} />
          <primitive object={cloudMaterial} attach="material" />
        </mesh>
      </group>
    </>
  )
}

export default Earth
