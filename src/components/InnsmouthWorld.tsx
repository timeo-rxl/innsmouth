import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gameStore, liveState, useGameStore } from '../state/gameStore'
import {
  BUILDINGS,
  LAMPS,
  LIGHTHOUSE_ALTAR_POS,
  LIGHTHOUSE_POS,
  RELICS,
  streetCenterX,
  type BuildingDef,
  type LampDef,
  type RelicDef,
} from '../world/levelData'
import { getProceduralTextures } from '../world/proceduralTextures'

const HARBOR_TENTACLES = [
  { x: -11.4, z: -42.5, scale: 1.15, phase: 0.2 },
  { x: 10.6, z: -43.0, scale: 1.35, phase: 1.4 },
  { x: -17.5, z: -38.5, scale: 1.0, phase: 2.7 },
  { x: 9.8, z: -52.5, scale: 1.45, phase: 3.9 },
  { x: -10.5, z: -54.5, scale: 1.2, phase: 5.1 },
]

const SHADOW_EYES = [
  { x: -5.4, y: 2.4, z: 27.5, rotY: 0.8, phase: 0.5 },
  { x: 7.4, y: 1.8, z: 16.0, rotY: -1.1, phase: 2.1 },
  { x: -12.6, y: 2.2, z: 2.0, rotY: 0.9, phase: 3.7 },
  { x: 7.2, y: 1.6, z: -13.5, rotY: -0.9, phase: 5.0 },
]

const REEF_CLUSTERS = [
  { x: -24, z: -56, scale: 1.25, seed: 1 },
  { x: 25, z: -59, scale: 1.45, seed: 2 },
  { x: -17, z: -72, scale: 1.65, seed: 3 },
  { x: 18, z: -75, scale: 1.5, seed: 4 },
]

const HARBOR_PROPS = [
  { x: -6.2, z: -32.4, rotY: 0.25 },
  { x: 5.6, z: -32.6, rotY: -0.32 },
  { x: 9.2, z: -26.5, rotY: 0.14 },
  { x: -5.8, z: 28.5, rotY: 0.42 },
  { x: 6.2, z: 14.5, rotY: -0.18 },
]

export function InnsmouthWorld() {
  const textures = useMemo(() => getProceduralTextures(), [])
  const { collectedMask, relicsCollected, settings } = useGameStore()
  const waterRef = useRef<THREE.Mesh>(null)
  const lightningLightRef = useRef<THREE.DirectionalLight>(null)

  useFrame((state, delta) => {
    textures.waterMap.offset.x = (textures.waterMap.offset.x + delta * 0.018) % 1
    textures.waterMap.offset.y = (textures.waterMap.offset.y + delta * 0.011) % 1
    if (waterRef.current) {
      waterRef.current.position.y = -0.78 + Math.sin(state.clock.elapsedTime * 1.25) * 0.05
    }
    if (lightningLightRef.current) {
      lightningLightRef.current.intensity = liveState.thunderFlash * 3.6
    }
  })

  // Curved street curb segments + crooked iron bollards following streetCenterX(z)
  const streetSegments = useMemo(() => {
    const segs: Array<{ z: number; x: number; rotY: number }> = []
    for (let z = 44; z >= -34; z -= 4) {
      const x1 = streetCenterX(z)
      const x2 = streetCenterX(z - 4)
      const angle = Math.atan2(x2 - x1, -4)
      segs.push({ z: z - 2, x: (x1 + x2) * 0.5, rotY: angle })
    }
    return segs
  }, [])

  return (
    <group>
      <color attach="background" args={['#061114']} />
      <fogExp2 attach="fog" args={['#08181b', 0.032]} />

      {/* Atmospheric night sky dome with dithering to eliminate 8-bit banding */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[145, 24, 16]} />
        <meshBasicMaterial color="#071519" side={THREE.BackSide} fog={false} dithering />
      </mesh>

      {/* Balanced eerie coastal moonlight + fill so Innsmouth architecture is readable yet oppressive */}
      <ambientLight color="#214039" intensity={0.58} />
      <hemisphereLight args={['#4a7d6d', '#0b1416', 0.52]} />
      <directionalLight
        position={[-22, 34, -64]}
        color="#8ae0b3"
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={5}
        shadow-camera-far={140}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-bias={-0.0005}
      />
      <directionalLight ref={lightningLightRef} position={[25, 45, -75]} color="#c4ffed" intensity={0} />

      {/* Greenish Moon over the harbor (single clean emissive disc, no stepped banding halo) */}
      <group position={[-22, 34, -92]}>
        <mesh>
          <sphereGeometry args={[5.2, 24, 24]} />
          <meshStandardMaterial
            map={textures.moonMap}
            color="#b4ffd8"
            emissive="#64e6a4"
            emissiveIntensity={1.55}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Wet Cobblestone Town Ground with procedural bump + rain puddles (60fps PBR reflections!) */}
      <mesh position={[0, -0.02, 6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[54, 84]} />
        <meshStandardMaterial
          map={textures.cobbleMap}
          bumpMap={textures.cobbleBumpMap}
          bumpScale={0.09}
          roughnessMap={textures.cobbleRoughnessMap}
          roughness={0.38}
          metalness={0.28}
          color="#8ba6a0"
          dithering
        />
      </mesh>

      {/* Extra Glossy Wet Road Spine following the curved main street */}
      {streetSegments.map((seg, i) => (
        <group key={i} position={[seg.x, 0, seg.z]} rotation={[0, seg.rotY, 0]}>
          {/* Wet reflective stone crown */}
          <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[7.1, 4.35]} />
            <meshStandardMaterial
              map={textures.cobbleMap}
              bumpMap={textures.cobbleBumpMap}
              bumpScale={0.07}
              roughnessMap={textures.cobbleRoughnessMap}
              roughness={0.2}
              metalness={0.42}
              color="#9cbab4"
              dithering
            />
          </mesh>
          {/* Sidewalk Curbs */}
          <mesh position={[-3.75, 0.08, 0]} receiveShadow>
            <boxGeometry args={[0.38, 0.16, 4.25]} />
            <meshStandardMaterial map={textures.stoneMap} bumpMap={textures.stoneBumpMap} bumpScale={0.04} color="#4f6360" roughness={0.55} />
          </mesh>
          <mesh position={[3.75, 0.08, 0]} receiveShadow>
            <boxGeometry args={[0.38, 0.16, 4.25]} />
            <meshStandardMaterial map={textures.stoneMap} bumpMap={textures.stoneBumpMap} bumpScale={0.04} color="#4f6360" roughness={0.55} />
          </mesh>
          {/* Crooked Cast-Iron Bollards */}
          {i % 3 === 0 && (
            <mesh position={[i % 2 === 0 ? -3.7 : 3.7, 0.48, 0]} rotation={[0.08, 0, i % 2 === 0 ? -0.12 : 0.11]} castShadow>
              <cylinderGeometry args={[0.09, 0.13, 0.92, 8]} />
              <meshStandardMaterial color="#1f2c2e" roughness={0.42} metalness={0.78} />
            </mesh>
          )}
        </group>
      ))}

      {/* Harbor Quay Wall & Pilings */}
      <mesh position={[0, -0.25, -34.2]} receiveShadow>
        <boxGeometry args={[48, 0.72, 1.2]} />
        <meshStandardMaterial map={textures.stoneMap} bumpMap={textures.stoneBumpMap} bumpScale={0.06} roughness={0.62} color="#586a68" />
      </mesh>
      {[-18, -10, -5, 5, 10, 16].map((px, i) => (
        <mesh key={i} position={[px, 0.42, -34.85]} rotation={[0.04, 0, (i % 2 === 0 ? 1 : -1) * 0.09]} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 2.5, 8]} />
          <meshStandardMaterial map={textures.woodMap} bumpMap={textures.woodBumpMap} bumpScale={0.05} color="#52493f" roughness={0.78} />
        </mesh>
      ))}

      {/* Pier Entrance Archway ("QUAI DU PHARE") for instant spatial readability */}
      <group position={[0, 0, -34.2]}>
        <mesh position={[-3.3, 2.3, 0]} rotation={[0, 0, -0.04]} castShadow>
          <boxGeometry args={[0.32, 4.6, 0.32]} />
          <meshStandardMaterial map={textures.woodMap} color="#4a4238" roughness={0.82} />
        </mesh>
        <mesh position={[3.3, 2.3, 0]} rotation={[0, 0, 0.05]} castShadow>
          <boxGeometry args={[0.32, 4.6, 0.32]} />
          <meshStandardMaterial map={textures.woodMap} color="#4a4238" roughness={0.82} />
        </mesh>
        <mesh position={[0, 4.35, 0]} rotation={[0, 0, -0.02]}>
          <boxGeometry args={[6.9, 0.95, 0.22]} />
          <meshStandardMaterial map={textures.signQuayMap} roughness={0.72} />
        </mesh>
      </group>

      {/* Central Stone Causeway to Lighthouse */}
      <mesh position={[0, -0.02, -46.5]} receiveShadow>
        <boxGeometry args={[7.2, 0.55, 25.5]} />
        <meshStandardMaterial
          map={textures.cobbleMap}
          bumpMap={textures.cobbleBumpMap}
          bumpScale={0.07}
          roughnessMap={textures.cobbleRoughnessMap}
          roughness={0.24}
          metalness={0.35}
          color="#94aea9"
        />
      </mesh>

      {/* West Wooden Pontoon (Relic #5) */}
      <mesh position={[-13.5, -0.05, -32.2]} receiveShadow>
        <boxGeometry args={[5.4, 0.35, 7.2]} />
        <meshStandardMaterial map={textures.woodMap} bumpMap={textures.woodBumpMap} bumpScale={0.06} roughness={0.75} color="#5b5247" />
      </mesh>

      {/* Moored Decaying Innsmouth Fishing Boats bobbing on the black sea */}
      <FishingBoat x={-8.2} z={-36.2} rotY={0.35} phase={0.4} woodMap={textures.woodMap} />
      <FishingBoat x={7.6} z={-36.8} rotY={-0.55} phase={2.1} woodMap={textures.woodMap} />

      {/* Harbor Crates & Tarred Barrels */}
      {HARBOR_PROPS.map((prop, idx) => (
        <HarborCrateCluster key={idx} x={prop.x} z={prop.z} rotY={prop.rotY} woodMap={textures.woodMap} />
      ))}

      {/* Lighthouse Island Platform */}
      <mesh position={[LIGHTHOUSE_POS.x, -0.06, LIGHTHOUSE_POS.z]} receiveShadow>
        <cylinderGeometry args={[7.5, 9.4, 0.9, 14]} />
        <meshStandardMaterial map={textures.stoneMap} bumpMap={textures.stoneBumpMap} bumpScale={0.08} roughness={0.68} color="#5e706c" />
      </mesh>

      {/* Craggy Devil's Reef Boulder Clusters (replaces stark primitive cones) */}
      {REEF_CLUSTERS.map((rc) => (
        <ReefRockCluster key={rc.seed} {...rc} stoneMap={textures.stoneMap} stoneBumpMap={textures.stoneBumpMap} />
      ))}

      {/* Black Harbor Sea */}
      <mesh ref={waterRef} position={[0, -0.78, -82]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[240, 120]} />
        <meshStandardMaterial
          map={textures.waterMap}
          roughness={0.14}
          metalness={0.78}
          color="#0e2c2f"
          dithering
        />
      </mesh>

      {/* Animated Harbor Tentacles */}
      {HARBOR_TENTACLES.map((tent, i) => (
        <HarborTentacle key={i} x={tent.x} z={tent.z} scale={tent.scale} phase={tent.phase} />
      ))}

      {/* Crooked 1920s New England Innsmouth Buildings */}
      {BUILDINGS.map((b) => (
        <InnsmouthBuilding key={b.id} building={b} textures={textures} />
      ))}

      {/* Flickering Streetlamps with wet puddle reflection pools */}
      {LAMPS.map((lamp) => (
        <StreetLamp key={lamp.id} lamp={lamp} mistMap={textures.mistMap} />
      ))}

      {/* Distant Blinking Eyes in Dark Alcoves */}
      {SHADOW_EYES.map((ey, i) => (
        <ShadowEyes key={i} x={ey.x} y={ey.y} z={ey.z} rotY={ey.rotY} phase={ey.phase} />
      ))}

      {/* Lightweight Falling Coastal Drizzle (disabled only in Eco mode) */}
      {settings.graphicsQuality === 'high' && <CoastalRain />}

      {/* Lighthouse + Soft Volumetric Rotating Beacon + Ritual Altar */}
      <Lighthouse
        unlocked={relicsCollected >= 5}
        runeMap={textures.runeMap}
        stoneMap={textures.stoneMap}
        stoneBumpMap={textures.stoneBumpMap}
        beamGradMap={textures.beamGradMap}
      />

      {/* 5 Lovecraftian Cult Relics */}
      {RELICS.map((relic) => (
        <CultRelic
          key={relic.id}
          relic={relic}
          collected={collectedMask[relic.index]}
          runeMap={textures.runeMap}
          stoneMap={textures.stoneMap}
        />
      ))}
    </group>
  )
}

/**
 * Real pitched New England gable roof geometry (triangular prism with eaves)
 */
function useGableRoofGeometry(width: number, depth: number, ridgeHeight: number) {
  return useMemo(() => {
    const hw = width * 0.56
    const shape = new THREE.Shape()
    shape.moveTo(-hw, 0)
    shape.lineTo(hw, 0)
    shape.lineTo(0, ridgeHeight)
    shape.closePath()

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: depth * 1.08,
      bevelEnabled: false,
    })
    geom.translate(0, 0, -(depth * 1.08) / 2)
    geom.computeVertexNormals()
    return geom
  }, [width, depth, ridgeHeight])
}

function InnsmouthBuilding({
  building,
  textures,
}: {
  building: BuildingDef
  textures: ReturnType<typeof getProceduralTextures>
}) {
  const wallMap = building.style === 'stone' ? textures.stoneMap : textures.woodMap
  const wallBump = building.style === 'stone' ? textures.stoneBumpMap : textures.woodBumpMap
  const wallColor =
    building.style === 'chapel'
      ? '#4b5c57'
      : building.style === 'warehouse'
        ? '#5b5248'
        : building.style === 'stone'
          ? '#5e6f6e'
          : '#645b4f'

  const lowerH = building.height * 0.54
  const upperH = building.height * 0.46
  const faceSign = building.x < 0 ? 1 : -1
  const upperW = building.width + 0.48
  const upperD = building.depth + 0.32
  const gableGeom = useGableRoofGeometry(upperW, upperD, 2.55)

  const showGilmanSign = building.id === 'b-w2'
  const showDagonSign = building.style === 'chapel'

  return (
    <group
      position={[building.x, 0, building.z]}
      rotation={[building.leanX * 0.42, building.rotY, building.leanZ * 0.42]}
    >
      {/* Mossy Stone Foundation Plinth */}
      <mesh position={[0, 0.38, 0]} receiveShadow>
        <boxGeometry args={[building.width + 0.34, 0.76, building.depth + 0.34]} />
        <meshStandardMaterial map={textures.stoneMap} bumpMap={textures.stoneBumpMap} bumpScale={0.06} color="#3b4a48" roughness={0.85} />
      </mesh>

      {/* Lower Story */}
      <mesh position={[0, lowerH / 2 + 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[building.width, lowerH, building.depth]} />
        <meshStandardMaterial map={wallMap} bumpMap={wallBump} bumpScale={0.07} color={wallColor} roughness={0.78} />
      </mesh>

      {/* Corner Timber Trim Pilasters */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            position={[sx * (building.width / 2), lowerH / 2 + 0.45, sz * (building.depth / 2)]}
          >
            <boxGeometry args={[0.24, lowerH, 0.24]} />
            <meshStandardMaterial color="#1f2523" roughness={0.88} />
          </mesh>
        ))
      )}

      {/* Porch Awning & Recessed Wooden Doorway facing the street */}
      <group position={[faceSign * (building.width / 2 + 0.05), 0, 0]}>
        <mesh position={[0, 1.48, 0]} rotation={[0.03, 0, faceSign * 0.04]}>
          <boxGeometry args={[0.14, 2.25, 1.2]} />
          <meshStandardMaterial color="#191613" roughness={0.9} />
        </mesh>
        {/* Wooden Door Frame + Porch Roof */}
        <mesh position={[faceSign * 0.45, 2.75, 0]} rotation={[0, 0, -faceSign * 0.22]} castShadow>
          <boxGeometry args={[1.15, 0.14, 2.1]} />
          <meshStandardMaterial map={textures.roofMap} color="#283238" roughness={0.8} />
        </mesh>
        <mesh position={[faceSign * 0.85, 1.35, -0.85]}>
          <cylinderGeometry args={[0.06, 0.07, 2.65, 6]} />
          <meshStandardMaterial color="#2a2824" roughness={0.88} />
        </mesh>
        <mesh position={[faceSign * 0.85, 1.35, 0.85]}>
          <cylinderGeometry args={[0.06, 0.07, 2.65, 6]} />
          <meshStandardMaterial color="#2a2824" roughness={0.88} />
        </mesh>

        {/* Ground-floor shuttered window */}
        <mesh position={[0.02 * faceSign, 1.85, 2.15]}>
          <boxGeometry args={[0.08, 1.22, 0.92]} />
          <meshStandardMaterial map={textures.windowDarkMap} roughness={0.35} metalness={0.25} />
        </mesh>

        {/* Authentic Innsmouth Wooden Signboards */}
        {(showGilmanSign || showDagonSign) && (
          <mesh
            position={[faceSign * 0.16, lowerH + 0.12, 0]}
            rotation={[0, faceSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0.03]}
          >
            <planeGeometry args={[3.4, 0.85]} />
            <meshStandardMaterial
              map={showGilmanSign ? textures.signGilmanMap : textures.signDagonMap}
              roughness={0.7}
            />
          </mesh>
        )}
      </group>

      {/* Overhanging Non-Euclidean Upper Story */}
      <group
        position={[faceSign * 0.24, lowerH + 0.42, 0]}
        rotation={[building.leanX * 0.85, 0, building.leanZ * 1.05]}
      >
        <mesh position={[0, upperH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[upperW, upperH, upperD]} />
          <meshStandardMaterial map={wallMap} bumpMap={wallBump} bumpScale={0.07} color={wallColor} roughness={0.78} />
        </mesh>

        {/* Cornice Molding */}
        <mesh position={[0, upperH + 0.05, 0]}>
          <boxGeometry args={[upperW + 0.3, 0.22, upperD + 0.3]} />
          <meshStandardMaterial color="#1d2424" roughness={0.85} />
        </mesh>

        {/* Authentic Pitched New England Gable Roof */}
        <mesh geometry={gableGeom} position={[0, upperH + 0.12, 0]} castShadow>
          <meshStandardMaterial map={textures.roofMap} color="#2d3940" roughness={0.74} />
        </mesh>

        {/* Esoteric Order Chapel Spire */}
        {building.style === 'chapel' && (
          <group position={[0, upperH + 2.4, 0]} rotation={[0.06, 0, -0.14]}>
            <mesh position={[0, 1.4, 0]} castShadow>
              <cylinderGeometry args={[0.35, 0.72, 3.2, 6]} />
              <meshStandardMaterial map={textures.roofMap} color="#243035" roughness={0.7} />
            </mesh>
            <mesh position={[0, 3.4, 0]}>
              <coneGeometry args={[0.45, 1.6, 6]} />
              <meshStandardMaterial color="#1b2628" roughness={0.6} />
            </mesh>
          </group>
        )}

        {/* Brick/Stone Chimney */}
        <mesh position={[building.width * 0.25, upperH + 1.45, building.depth * 0.2]} castShadow>
          <boxGeometry args={[0.72, 2.4, 0.72]} />
          <meshStandardMaterial map={textures.stoneMap} color="#475152" roughness={0.88} />
        </mesh>

        {/* Framed Muntin Windows (textured panes instead of flat solid emissive rectangles) */}
        <mesh position={[faceSign * (upperW / 2 + 0.04), upperH * 0.52, -1.35]}>
          <boxGeometry args={[0.08, 1.28, 0.92]} />
          {building.litWindows ? (
            <meshStandardMaterial
              map={textures.windowLitGreenMap}
              emissiveMap={textures.windowLitGreenMap}
              emissive="#72d99a"
              emissiveIntensity={0.85}
              roughness={0.3}
            />
          ) : (
            <meshStandardMaterial map={textures.windowDarkMap} roughness={0.32} metalness={0.28} />
          )}
        </mesh>
        <mesh position={[faceSign * (upperW / 2 + 0.04), upperH * 0.52, 1.35]}>
          <boxGeometry args={[0.08, 1.28, 0.92]} />
          {building.litWindows ? (
            <meshStandardMaterial
              map={textures.windowLitAmberMap}
              emissiveMap={textures.windowLitAmberMap}
              emissive="#e6a44e"
              emissiveIntensity={0.82}
              roughness={0.3}
            />
          ) : (
            <meshStandardMaterial map={textures.windowDarkMap} roughness={0.32} metalness={0.28} />
          )}
        </mesh>
      </group>
    </group>
  )
}

function FishingBoat({
  x,
  z,
  rotY,
  phase,
  woodMap,
}: {
  x: number
  z: number
  rotY: number
  phase: number
  woodMap: THREE.CanvasTexture
}) {
  const boatRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!boatRef.current) return
    const t = state.clock.elapsedTime
    boatRef.current.position.y = -0.58 + Math.sin(t * 1.4 + phase) * 0.08
    boatRef.current.rotation.z = Math.sin(t * 1.1 + phase) * 0.06
    boatRef.current.rotation.x = Math.cos(t * 0.9 + phase) * 0.04
  })

  return (
    <group ref={boatRef} position={[x, -0.58, z]} rotation={[0, rotY, 0]}>
      {/* Hull */}
      <mesh scale={[1, 0.55, 2.2]}>
        <cylinderGeometry args={[0.85, 0.52, 1.1, 8]} />
        <meshStandardMaterial map={woodMap} color="#4f463b" roughness={0.82} />
      </mesh>
      {/* Bench planks */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[1.25, 0.08, 0.35]} />
        <meshStandardMaterial map={woodMap} color="#3d3730" roughness={0.88} />
      </mesh>
      {/* Mast stump */}
      <mesh position={[0, 0.95, 0.3]} rotation={[0.08, 0, -0.1]}>
        <cylinderGeometry args={[0.05, 0.08, 1.9, 6]} />
        <meshStandardMaterial color="#352f28" roughness={0.9} />
      </mesh>
    </group>
  )
}

function HarborCrateCluster({
  x,
  z,
  rotY,
  woodMap,
}: {
  x: number
  z: number
  rotY: number
  woodMap: THREE.CanvasTexture
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.86, 0.84, 0.86]} />
        <meshStandardMaterial map={woodMap} color="#584d3f" roughness={0.84} />
      </mesh>
      <mesh position={[0.78, 0.44, 0.24]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.34, 0.88, 10]} />
        <meshStandardMaterial map={woodMap} color="#453c33" roughness={0.8} />
      </mesh>
      <mesh position={[-0.1, 1.12, 0.05]} rotation={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.58, 0.56, 0.58]} />
        <meshStandardMaterial map={woodMap} color="#4d4438" roughness={0.86} />
      </mesh>
    </group>
  )
}

function ReefRockCluster({
  x,
  z,
  scale,
  seed,
  stoneMap,
  stoneBumpMap,
}: {
  x: number
  z: number
  scale: number
  seed: number
  stoneMap: THREE.CanvasTexture
  stoneBumpMap: THREE.CanvasTexture
}) {
  return (
    <group position={[x, -0.8, z]} rotation={[0, seed * 1.1, 0]}>
      <mesh position={[0, 2.2 * scale, 0]} scale={[1.1 * scale, 2.1 * scale, 0.9 * scale]} rotation={[0.1, 0.4, -0.15]}>
        <dodecahedronGeometry args={[2.1, 1]} />
        <meshStandardMaterial map={stoneMap} bumpMap={stoneBumpMap} bumpScale={0.12} color="#243332" roughness={0.86} />
      </mesh>
      <mesh position={[2.2 * scale, 1.1 * scale, 0.9 * scale]} scale={[1.2 * scale, 1.15 * scale, 1.0 * scale]}>
        <dodecahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial map={stoneMap} bumpMap={stoneBumpMap} bumpScale={0.1} color="#1e2c2b" roughness={0.88} />
      </mesh>
      <mesh position={[-1.9 * scale, 0.9 * scale, -0.8 * scale]} scale={[0.95 * scale, 1.35 * scale, 1.1 * scale]}>
        <dodecahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial map={stoneMap} bumpMap={stoneBumpMap} bumpScale={0.1} color="#21302e" roughness={0.88} />
      </mesh>
    </group>
  )
}

function HarborTentacle({
  x,
  z,
  scale,
  phase,
}: {
  x: number
  z: number
  scale: number
  phase: number
}) {
  const segRefs = useRef<Array<THREE.Group | null>>([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < segRefs.current.length; i++) {
      const seg = segRefs.current[i]
      if (!seg) continue
      seg.rotation.z = Math.sin(t * 1.35 + phase + i * 0.52) * (0.16 + i * 0.035)
      seg.rotation.x = Math.cos(t * 1.05 + phase + i * 0.42) * (0.13 + i * 0.024)
    }
  })

  const renderSegment = (depth: number): ReactNode => {
    if (depth >= 6) return null
    const radiusTop = Math.max(0.06, (0.46 - depth * 0.068) * scale)
    const radiusBot = Math.max(0.09, (0.54 - depth * 0.068) * scale)
    const segLen = (1.12 - depth * 0.08) * scale

    return (
      <group
        ref={(el) => {
          segRefs.current[depth] = el
        }}
        position={[0, depth === 0 ? 0 : segLen * 0.92, 0]}
      >
        <mesh position={[0, segLen * 0.5, 0]}>
          <cylinderGeometry args={[radiusTop, radiusBot, segLen, 10]} />
          <meshStandardMaterial color="#0f2621" roughness={0.34} metalness={0.18} />
        </mesh>
        {depth < 5 && (
          <mesh position={[radiusBot * 0.72, segLen * 0.48, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[radiusTop * 0.24, radiusTop * 0.28, 0.09, 6]} />
            <meshStandardMaterial color="#234f44" roughness={0.42} />
          </mesh>
        )}
        {renderSegment(depth + 1)}
      </group>
    )
  }

  return (
    <group position={[x, -0.85, z]}>
      {renderSegment(0)}
    </group>
  )
}

function CoastalRain() {
  const count = 160
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const drops = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        ox: (Math.random() - 0.5) * 26,
        oy: Math.random() * 14,
        oz: (Math.random() - 0.5) * 26,
        speed: 13 + Math.random() * 5,
      })),
    []
  )

  useFrame((_, delta) => {
    const inst = meshRef.current
    if (!inst || gameStore.getSnapshot().phase === 'paused') return
    const dt = Math.min(delta, 0.05)
    for (let i = 0; i < count; i++) {
      const d = drops[i]
      d.oy -= d.speed * dt
      if (d.oy < 0) d.oy += 14
      dummy.position.set(liveState.playerX + d.ox, d.oy, liveState.playerZ + d.oz)
      dummy.rotation.set(0, 0, 0.08)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    }
    inst.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.014, 0.42, 0.014]} />
      <meshBasicMaterial color="#88b8b0" transparent opacity={0.22} depthWrite={false} />
    </instancedMesh>
  )
}

function ShadowEyes({
  x,
  y,
  z,
  rotY,
  phase,
}: {
  x: number
  y: number
  z: number
  rotY: number
  phase: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    const dist = Math.hypot(liveState.playerX - x, liveState.playerZ - z)
    const closeFade = dist < 8.5 && liveState.flashlightOn ? 0 : 1
    const blink = Math.sin(t * 0.8 + phase) > -0.78 ? 1 : 0.05
    const scale = closeFade * blink
    groupRef.current.scale.set(scale, scale, scale)
  })

  return (
    <group ref={groupRef} position={[x, y, z]} rotation={[0, rotY, 0]}>
      <mesh position={[-0.1, 0, 0]}>
        <sphereGeometry args={[0.042, 6, 6]} />
        <meshStandardMaterial color="#d2ff52" emissive="#a8ff2e" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <mesh position={[0.1, 0, 0]}>
        <sphereGeometry args={[0.042, 6, 6]} />
        <meshStandardMaterial color="#d2ff52" emissive="#a8ff2e" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

function StreetLamp({ lamp, mistMap }: { lamp: LampDef; mistMap: THREE.CanvasTexture }) {
  const lightRef = useRef<THREE.PointLight>(null)
  const bulbMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const puddleMatRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const flicker =
      0.86 +
      0.12 * Math.sin(t * lamp.flickerSpeed + lamp.flickerPhase) +
      0.06 * Math.sin(t * 17.5 + lamp.flickerPhase)
    if (lightRef.current) {
      lightRef.current.intensity = 18 * flicker
    }
    if (bulbMatRef.current) {
      bulbMatRef.current.emissiveIntensity = 2.1 * flicker
    }
    if (puddleMatRef.current) {
      puddleMatRef.current.opacity = 0.24 * flicker
    }
  })

  return (
    <group position={[lamp.x, 0, lamp.z]}>
      {/* Fluted Iron Base & Post */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 0.7, 8]} />
        <meshStandardMaterial color="#1b2426" roughness={0.45} metalness={0.78} />
      </mesh>
      <mesh position={[0, 2.25, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.12, 3.8, 8]} />
        <meshStandardMaterial color="#1a2224" roughness={0.48} metalness={0.78} />
      </mesh>
      {/* Lantern Cap & Glass */}
      <mesh position={[0, 4.32, 0]}>
        <cylinderGeometry args={[0.26, 0.18, 0.46, 6]} />
        <meshStandardMaterial
          ref={bulbMatRef}
          color="#ffe3a3"
          emissive="#ffb84d"
          emissiveIntensity={2.1}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 4.65, 0]}>
        <coneGeometry args={[0.34, 0.28, 6]} />
        <meshStandardMaterial color="#141a1c" roughness={0.6} metalness={0.7} />
      </mesh>
      {/* Warm Wet Puddle Reflection Sheen on Ground */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.8, 5.8]} />
        <meshBasicMaterial
          ref={puddleMatRef}
          map={mistMap}
          color="#ffba5c"
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 4.05, 0]}
        color="#ffbd63"
        intensity={18}
        distance={17}
        decay={1.45}
      />
    </group>
  )
}

function Lighthouse({
  unlocked,
  runeMap,
  stoneMap,
  stoneBumpMap,
  beamGradMap,
}: {
  unlocked: boolean
  runeMap: THREE.CanvasTexture
  stoneMap: THREE.CanvasTexture
  stoneBumpMap: THREE.CanvasTexture
  beamGradMap: THREE.CanvasTexture
}) {
  const beamRef = useRef<THREE.Group>(null)
  const altarGlowRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (beamRef.current) {
      beamRef.current.rotation.y += delta * 0.48
    }
    if (altarGlowRef.current) {
      const t = state.clock.elapsedTime
      altarGlowRef.current.rotation.z = t * (unlocked ? 1.4 : 0.35)
    }
  })

  const beamColor = unlocked ? '#5bffbe' : '#96f279'

  return (
    <group>
      <group position={[LIGHTHOUSE_POS.x, 0, LIGHTHOUSE_POS.z]}>
        {/* Tapered Stone Tower */}
        <mesh position={[0, 10, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.1, 3.25, 20, 16]} />
          <meshStandardMaterial map={stoneMap} bumpMap={stoneBumpMap} bumpScale={0.08} color="#637572" roughness={0.76} />
        </mesh>

        {/* Iron Gallery Walkway */}
        <mesh position={[0, 20.1, 0]}>
          <cylinderGeometry args={[2.75, 2.35, 0.65, 16]} />
          <meshStandardMaterial color="#1f2a2b" roughness={0.48} metalness={0.68} />
        </mesh>

        {/* Beacon Lantern Room */}
        <mesh position={[0, 21.6, 0]}>
          <cylinderGeometry args={[1.6, 1.6, 2.4, 14]} />
          <meshStandardMaterial
            color={unlocked ? '#9effda' : '#dcffaa'}
            emissive={unlocked ? '#3ef5b0' : '#8ce864'}
            emissiveIntensity={2.1}
            toneMapped={false}
          />
        </mesh>

        {/* Dome Roof */}
        <mesh position={[0, 23.4, 0]}>
          <coneGeometry args={[2.1, 1.8, 14]} />
          <meshStandardMaterial color="#182224" roughness={0.55} metalness={0.6} />
        </mesh>

        {/* Soft Multi-Layer Volumetric Beacon Beam (no hard polygonal edge!) */}
        <group ref={beamRef} position={[0, 21.6, 0]}>
          <mesh position={[0, -0.8, 17]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.9, 5.2, 34, 20, 1, true]} />
            <meshBasicMaterial
              map={beamGradMap}
              color={beamColor}
              transparent
              opacity={0.28}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, -0.8, 13]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.6, 2.6, 26, 16, 1, true]} />
            <meshBasicMaterial
              map={beamGradMap}
              color={beamColor}
              transparent
              opacity={0.24}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <pointLight color="#a3ff7a" intensity={16} distance={36} decay={1.5} />
        </group>
      </group>

      {/* Ritual Altar in front of Lighthouse */}
      <group position={[LIGHTHOUSE_ALTAR_POS.x, 0, LIGHTHOUSE_ALTAR_POS.z]}>
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.95, 1.25, 1.44, 8]} />
          <meshStandardMaterial map={stoneMap} bumpMap={stoneBumpMap} bumpScale={0.07} color="#3d504d" roughness={0.68} />
        </mesh>
        <mesh ref={altarGlowRef} position={[0, 1.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 2.4]} />
          <meshBasicMaterial
            map={runeMap}
            color={unlocked ? '#4dffba' : '#ff6b4a'}
            transparent
            opacity={0.92}
            toneMapped={false}
          />
        </mesh>
        <pointLight
          position={[0, 2.2, 0]}
          color={unlocked ? '#4dffba' : '#ff7b52'}
          intensity={unlocked ? 11 : 6}
          distance={13}
        />
      </group>
    </group>
  )
}

function CultRelic({
  relic,
  collected,
  runeMap,
  stoneMap,
}: {
  relic: RelicDef
  collected: boolean
  runeMap: THREE.CanvasTexture
  stoneMap: THREE.CanvasTexture
}) {
  const artifactRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!artifactRef.current || collected) return
    const t = state.clock.elapsedTime
    artifactRef.current.position.y = 1.28 + Math.sin(t * 2.1 + relic.index) * 0.12
    artifactRef.current.rotation.y = t * 1.15 + relic.index
  })

  if (collected) return null

  return (
    <group position={[relic.x, 0, relic.z]}>
      {/* Stepped Mossy Basalt Shrine Pedestal */}
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <cylinderGeometry args={[0.68, 0.78, 0.32, 6]} />
        <meshStandardMaterial map={stoneMap} color="#2c3b38" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.54, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.5, 0.56, 6]} />
        <meshStandardMaterial map={stoneMap} color="#344643" roughness={0.82} />
      </mesh>

      {/* Carved Ground Sigil */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.3, 2.3]} />
        <meshBasicMaterial
          map={runeMap}
          color={relic.color}
          transparent
          opacity={0.58}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Sculpted Eldritch Stone Idol / Relic Totem (not a generic Saturn orb!) */}
      <group ref={artifactRef} position={[0, 1.28, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.24, 0.62, 5]} />
          <meshStandardMaterial
            color="#1c4a3d"
            emissive={relic.color}
            emissiveIntensity={0.65}
            roughness={0.32}
            metalness={0.55}
          />
        </mesh>
        {/* Eldritch Crown / Core Gem */}
        <mesh position={[0, 0.36, 0]}>
          <octahedronGeometry args={[0.17, 0]} />
          <meshStandardMaterial
            color={relic.color}
            emissive={relic.color}
            emissiveIntensity={2.0}
            roughness={0.18}
            metalness={0.4}
            toneMapped={false}
          />
        </mesh>
        {/* Twin Carved Runic Fins */}
        <mesh position={[-0.22, 0.05, 0]} rotation={[0, 0, 0.32]}>
          <boxGeometry args={[0.08, 0.42, 0.12]} />
          <meshStandardMaterial color="#215948" emissive={relic.color} emissiveIntensity={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.22, 0.05, 0]} rotation={[0, 0, -0.32]}>
          <boxGeometry args={[0.08, 0.42, 0.12]} />
          <meshStandardMaterial color="#215948" emissive={relic.color} emissiveIntensity={0.5} roughness={0.35} />
        </mesh>
      </group>

      <pointLight position={[0, 1.55, 0]} color={relic.color} intensity={7.5} distance={12} decay={1.7} />
    </group>
  )
}
