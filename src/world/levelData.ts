export interface BoxCollider {
  id: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  blocksSight?: boolean
}

export interface BuildingDef {
  id: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  rotY: number
  leanX: number
  leanZ: number
  style: 'wood' | 'stone' | 'warehouse' | 'chapel'
  litWindows: boolean
}

export interface LampDef {
  id: string
  x: number
  z: number
  safeRadius: number
  flickerPhase: number
  flickerSpeed: number
}

export interface RelicDef {
  id: string
  index: number
  name: string
  x: number
  z: number
  color: string
}

/**
 * Non-Euclidean street centerline curve: bends subtly along Z so the town feels warped.
 */
export function streetCenterX(z: number): number {
  if (z > 28) return 0
  if (z < -30) return 0
  const t = (z + 30) / 58 // 0 at harbor (-30), 1 at south (+28)
  return Math.sin(t * Math.PI) * 3.6
}

export const PLAYER_SPAWN = { x: 0, y: 1.7, z: 40 }
export const LIGHTHOUSE_POS = { x: 0, z: -56 }
export const LIGHTHOUSE_ALTAR_POS = { x: 0, z: -50.2 }

export const LAMPS: LampDef[] = [
  { id: 'lamp-spawn', x: -3.2, z: 37, safeRadius: 7.2, flickerPhase: 0.4, flickerSpeed: 3.1 },
  { id: 'lamp-south', x: 5.5, z: 21, safeRadius: 6.8, flickerPhase: 1.7, flickerSpeed: 4.7 },
  { id: 'lamp-mid', x: 0.3, z: 5, safeRadius: 6.8, flickerPhase: 2.8, flickerSpeed: 5.3 },
  { id: 'lamp-north', x: 5.4, z: -11, safeRadius: 6.8, flickerPhase: 0.9, flickerSpeed: 3.9 },
  { id: 'lamp-quay', x: -3.8, z: -26, safeRadius: 7.2, flickerPhase: 4.1, flickerSpeed: 6.2 },
  { id: 'lamp-pier', x: 2.6, z: -42, safeRadius: 7.5, flickerPhase: 2.1, flickerSpeed: 2.8 },
]

export const RELICS: RelicDef[] = [
  { id: 'relic-1', index: 0, name: 'Idole de Dagon', x: 11.8, z: 24.5, color: '#38f2af' },
  { id: 'relic-2', index: 1, name: "Calice de l'Auberge Gilman", x: -9.8, z: 11.5, color: '#58f7c4' },
  { id: 'relic-3', index: 2, name: "Tablette de R'lyeh", x: -11.5, z: -7.5, color: '#2ee6d6' },
  { id: 'relic-4', index: 3, name: "Couronne d'Innsmouth", x: 12.2, z: -15.5, color: '#7bffb2' },
  { id: 'relic-5', index: 4, name: 'Sceau du Récif du Diable', x: -13.5, z: -31.5, color: '#45ffd1' },
]

export const BUILDINGS: BuildingDef[] = [
  // West row (left side of street) — deliberately skewed/warped Innsmouth architecture
  { id: 'b-w1', x: -10.5, z: 32, width: 7.2, depth: 8.6, height: 7.4, rotY: 0.08, leanX: 0.05, leanZ: -0.09, style: 'wood', litWindows: true },
  { id: 'b-w2', x: -9.5, z: 19, width: 6.8, depth: 8.2, height: 8.8, rotY: -0.11, leanX: -0.07, leanZ: -0.13, style: 'wood', litWindows: false },
  { id: 'b-w3', x: -15.5, z: 10.5, width: 6.5, depth: 7.4, height: 6.8, rotY: 0.16, leanX: 0.08, leanZ: 0.06, style: 'stone', litWindows: true },
  { id: 'b-w4', x: -8.2, z: 1, width: 6.6, depth: 8.0, height: 9.6, rotY: -0.08, leanX: 0.04, leanZ: -0.11, style: 'chapel', litWindows: true },
  { id: 'b-w5', x: -16.8, z: -9, width: 7.4, depth: 8.8, height: 6.6, rotY: 0.06, leanX: -0.05, leanZ: 0.07, style: 'warehouse', litWindows: false },
  { id: 'b-w6', x: -8.8, z: -19, width: 6.6, depth: 7.6, height: 7.8, rotY: 0.12, leanX: 0.06, leanZ: -0.08, style: 'wood', litWindows: true },

  // East row (right side of street)
  { id: 'b-e1', x: 10.8, z: 33, width: 7.2, depth: 8.4, height: 7.6, rotY: -0.07, leanX: -0.06, leanZ: 0.09, style: 'stone', litWindows: false },
  { id: 'b-e2', x: 16.5, z: 22, width: 6.8, depth: 7.8, height: 7.0, rotY: 0.14, leanX: 0.09, leanZ: -0.05, style: 'wood', litWindows: true },
  { id: 'b-e3', x: 12.2, z: 11, width: 7.0, depth: 8.8, height: 9.0, rotY: -0.12, leanX: -0.07, leanZ: 0.12, style: 'warehouse', litWindows: true },
  { id: 'b-e4', x: 12.8, z: -2, width: 6.8, depth: 8.4, height: 8.4, rotY: 0.09, leanX: 0.06, leanZ: 0.14, style: 'wood', litWindows: false },
  { id: 'b-e5', x: 17.2, z: -15, width: 6.4, depth: 7.6, height: 6.9, rotY: -0.14, leanX: -0.09, leanZ: 0.06, style: 'stone', litWindows: true },
  { id: 'b-e6', x: 10.4, z: -21, width: 6.8, depth: 7.2, height: 7.4, rotY: 0.1, leanX: 0.05, leanZ: -0.07, style: 'wood', litWindows: false },
]

// Static colliders derived from buildings + lighthouse + harbor barriers
export const COLLIDERS: BoxCollider[] = [
  ...BUILDINGS.map((b) => {
    // Slightly conservative axis-aligned bounds for reliable sliding and line-of-sight
    const halfW = b.width * 0.48
    const halfD = b.depth * 0.48
    return {
      id: b.id,
      minX: b.x - halfW,
      maxX: b.x + halfW,
      minZ: b.z - halfD,
      maxZ: b.z + halfD,
      blocksSight: true,
    }
  }),
  // Lighthouse base stone tower
  {
    id: 'lighthouse-tower',
    minX: LIGHTHOUSE_POS.x - 3.6,
    maxX: LIGHTHOUSE_POS.x + 3.6,
    minZ: LIGHTHOUSE_POS.z - 3.6,
    maxZ: LIGHTHOUSE_POS.z + 3.6,
    blocksSight: true,
  },
  // South border wall behind spawn
  { id: 'bound-south', minX: -26, maxX: 26, minZ: 45, maxZ: 48, blocksSight: false },
  // West/East town limits
  { id: 'bound-west', minX: -24, maxX: -21, minZ: -36, maxZ: 46, blocksSight: false },
  { id: 'bound-east', minX: 21, maxX: 24, minZ: -36, maxZ: 46, blocksSight: false },
  // Harbor water boundaries (keep player on quay z >= -34 except on central pier [-3.6..3.6] and west pontoon)
  { id: 'water-east-quay', minX: 3.9, maxX: 24, minZ: -64, maxZ: -34.2, blocksSight: false },
  { id: 'water-west-quay-far', minX: -24, maxX: -16.2, minZ: -64, maxZ: -29.2, blocksSight: false },
  { id: 'water-west-gap', minX: -10.8, maxX: -3.9, minZ: -64, maxZ: -34.2, blocksSight: false },
  { id: 'water-pontoon-tip', minX: -16.5, maxX: -10.5, minZ: -64, maxZ: -35.8, blocksSight: false },
  { id: 'water-north', minX: -12, maxX: 12, minZ: -65, maxZ: -61.2, blocksSight: false },
]

export const PATROL_WAYPOINTS: Array<{ x: number; z: number }> = [
  { x: 2.5, z: 26 },
  { x: 9.5, z: 18 },
  { x: 2.8, z: 5 },
  { x: -11.5, z: 3 },
  { x: 3.0, z: -9 },
  { x: 9.5, z: -15 },
  { x: 0.5, z: -27 },
  { x: -12.5, z: -29 },
  { x: -2.0, z: -14 },
  { x: -2.5, z: 15 },
]

/**
 * Resolves 2D circle vs AABB collisions with smooth wall sliding.
 */
export function resolveMovementCollision(
  x: number,
  z: number,
  radius: number,
  colliders: BoxCollider[] = COLLIDERS
): { x: number; z: number } {
  let nx = x
  let nz = z

  for (let pass = 0; pass < 2; pass++) {
    for (const box of colliders) {
      const closestX = Math.max(box.minX, Math.min(nx, box.maxX))
      const closestZ = Math.max(box.minZ, Math.min(nz, box.maxZ))
      const dx = nx - closestX
      const dz = nz - closestZ
      const distSq = dx * dx + dz * dz

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq)
        if (dist > 0.0001) {
          const push = radius - dist
          nx += (dx / dist) * push
          nz += (dz / dist) * push
        } else {
          // Inside box: push out along shallowest axis
          const penLeft = Math.abs(nx - box.minX)
          const penRight = Math.abs(box.maxX - nx)
          const penTop = Math.abs(nz - box.minZ)
          const penBottom = Math.abs(box.maxZ - nz)
          const minPen = Math.min(penLeft, penRight, penTop, penBottom)
          if (minPen === penLeft) nx = box.minX - radius
          else if (minPen === penRight) nx = box.maxX + radius
          else if (minPen === penTop) nz = box.minZ - radius
          else nz = box.maxZ + radius
        }
      }
    }
  }

  return { x: nx, z: nz }
}

/**
 * 2D segment-vs-AABB intersection check for creature line-of-sight.
 */
export function hasLineOfSight(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  colliders: BoxCollider[] = COLLIDERS
): boolean {
  const dx = bx - ax
  const dz = bz - az

  for (const box of colliders) {
    if (!box.blocksSight) continue

    let tmin = 0
    let tmax = 1

    if (Math.abs(dx) < 1e-6) {
      if (ax < box.minX || ax > box.maxX) continue
    } else {
      const invD = 1 / dx
      let t1 = (box.minX - ax) * invD
      let t2 = (box.maxX - ax) * invD
      if (t1 > t2) [t1, t2] = [t2, t1]
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) continue
    }

    if (Math.abs(dz) < 1e-6) {
      if (az < box.minZ || az > box.maxZ) continue
    } else {
      const invD = 1 / dz
      let t1 = (box.minZ - az) * invD
      let t2 = (box.maxZ - az) * invD
      if (t1 > t2) [t1, t2] = [t2, t1]
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) continue
    }

    if (tmin <= tmax && tmax >= 0 && tmin <= 1) {
      return false
    }
  }

  return true
}

export function isPointInSafeLight(x: number, z: number): boolean {
  for (const lamp of LAMPS) {
    const dx = x - lamp.x
    const dz = z - lamp.z
    if (dx * dx + dz * dz <= lamp.safeRadius * lamp.safeRadius) {
      return true
    }
  }
  const ldx = x - LIGHTHOUSE_ALTAR_POS.x
  const ldz = z - LIGHTHOUSE_ALTAR_POS.z
  if (ldx * ldx + ldz * ldz <= 9.0 * 9.0) {
    return true
  }
  return false
}
