import * as THREE from 'three'

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  return [canvas, ctx]
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export interface ProceduralTextureSet {
  cobbleMap: THREE.CanvasTexture
  cobbleBumpMap: THREE.CanvasTexture
  cobbleRoughnessMap: THREE.CanvasTexture
  woodMap: THREE.CanvasTexture
  woodBumpMap: THREE.CanvasTexture
  stoneMap: THREE.CanvasTexture
  stoneBumpMap: THREE.CanvasTexture
  roofMap: THREE.CanvasTexture
  waterMap: THREE.CanvasTexture
  runeMap: THREE.CanvasTexture
  mistMap: THREE.CanvasTexture
  moonMap: THREE.CanvasTexture
  windowLitGreenMap: THREE.CanvasTexture
  windowLitAmberMap: THREE.CanvasTexture
  windowDarkMap: THREE.CanvasTexture
  beamGradMap: THREE.CanvasTexture
  signGilmanMap: THREE.CanvasTexture
  signDagonMap: THREE.CanvasTexture
  signQuayMap: THREE.CanvasTexture
}

let cachedSet: ProceduralTextureSet | null = null

function createWindowTexture(litColor: string | null, glowCore: string | null): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 192)
  // Dark weathered wooden frame
  ctx.fillStyle = '#151b1a'
  ctx.fillRect(0, 0, 128, 192)

  // Recessed glass area
  if (litColor && glowCore) {
    const grad = ctx.createRadialGradient(64, 110, 12, 64, 96, 86)
    grad.addColorStop(0, glowCore)
    grad.addColorStop(0.55, litColor)
    grad.addColorStop(1, '#1c2a24')
    ctx.fillStyle = grad
  } else {
    const grad = ctx.createLinearGradient(0, 12, 0, 180)
    grad.addColorStop(0, '#122224')
    grad.addColorStop(1, '#080f11')
    ctx.fillStyle = grad
  }
  ctx.fillRect(14, 14, 100, 164)

  // Dirty grime streaks on panes
  ctx.fillStyle = 'rgba(6, 12, 12, 0.28)'
  ctx.fillRect(14, 14, 100, 26)
  ctx.fillRect(14, 150, 100, 28)

  // Crisp New England window muntins (2x3 panes)
  ctx.fillStyle = '#101515'
  ctx.fillRect(60, 14, 8, 164)
  ctx.fillRect(14, 66, 100, 7)
  ctx.fillRect(14, 122, 100, 7)

  // Outer trim highlight
  ctx.strokeStyle = '#2d3b37'
  ctx.lineWidth = 4
  ctx.strokeRect(4, 4, 120, 184)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function createSignTexture(title: string, subtitle: string): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 128)
  ctx.fillStyle = '#141917'
  ctx.fillRect(0, 0, 512, 128)

  // Planks + damp moss border
  ctx.fillStyle = '#1b221e'
  for (let y = 0; y < 128; y += 32) {
    ctx.fillRect(4, y + 2, 504, 28)
  }
  ctx.strokeStyle = '#47665a'
  ctx.lineWidth = 5
  ctx.strokeRect(8, 8, 496, 112)

  ctx.fillStyle = '#b9d6c6'
  ctx.font = 'bold 34px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, 256, 52)

  ctx.fillStyle = '#6da38d'
  ctx.font = 'italic 20px Georgia, serif'
  ctx.fillText(subtitle, 256, 92)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function getProceduralTextures(): ProceduralTextureSet {
  if (cachedSet) return cachedSet

  // 1. 512x512 Wet Cobblestone Albedo + Bump + Puddle Roughness Map
  const [cobbleCanvas, cCtx] = makeCanvas(512, 512)
  const [cobbleBumpCanvas, cbCtx] = makeCanvas(512, 512)
  const [roughCanvas, rCtx] = makeCanvas(512, 512)
  const randC = seededRand(1899)

  cCtx.fillStyle = '#0d1416'
  cCtx.fillRect(0, 0, 512, 512)
  cbCtx.fillStyle = '#121212'
  cbCtx.fillRect(0, 0, 512, 512)
  rCtx.fillStyle = '#b8b8b8'
  rCtx.fillRect(0, 0, 512, 512)

  const rows = 14
  const cols = 10
  const rowH = 512 / rows
  const colW = 512 / cols

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (colW * 0.5)
    for (let col = -1; col <= cols; col++) {
      const x = col * colW + offset + 3
      const y = row * rowH + 3
      const w = colW - 6
      const h = rowH - 6
      const base = 36 + Math.floor(randC() * 34)
      const g = base + 5 + Math.floor(randC() * 10)
      const b = base + 8 + Math.floor(randC() * 10)
      cCtx.fillStyle = `rgb(${base}, ${g}, ${b})`
      cCtx.beginPath()
      cCtx.roundRect(x, y, w, h, 7)
      cCtx.fill()

      // Highlight bevel on cobble bump
      const bVal = 155 + Math.floor(randC() * 80)
      cbCtx.fillStyle = `rgb(${bVal}, ${bVal}, ${bVal})`
      cbCtx.beginPath()
      cbCtx.roundRect(x + 2, y + 2, w - 4, h - 4, 6)
      cbCtx.fill()

      // Damp sheen variation per stone
      const rv = 48 + Math.floor(randC() * 95)
      rCtx.fillStyle = `rgb(${rv}, ${rv}, ${rv})`
      rCtx.beginPath()
      rCtx.roundRect(x, y, w, h, 7)
      rCtx.fill()
    }
  }

  // Mirror-glossy dark rain puddles (very low roughness = strong realistic lamp speculars)
  for (let i = 0; i < 10; i++) {
    const px = randC() * 512
    const py = randC() * 512
    const rx = 34 + randC() * 64
    const ry = 24 + randC() * 52
    const grad = rCtx.createRadialGradient(px, py, 4, px, py, Math.max(rx, ry))
    grad.addColorStop(0, 'rgba(10, 10, 10, 0.96)')
    grad.addColorStop(0.65, 'rgba(24, 24, 24, 0.78)')
    grad.addColorStop(1, 'rgba(128, 128, 128, 0)')
    rCtx.fillStyle = grad
    rCtx.beginPath()
    rCtx.ellipse(px, py, rx, ry, randC() * Math.PI, 0, Math.PI * 2)
    rCtx.fill()

    // Flatten bump inside puddle
    cbCtx.fillStyle = 'rgba(95, 95, 95, 0.65)'
    cbCtx.beginPath()
    cbCtx.ellipse(px, py, rx * 0.85, ry * 0.85, 0, 0, Math.PI * 2)
    cbCtx.fill()

    cCtx.fillStyle = 'rgba(7, 16, 19, 0.36)'
    cCtx.beginPath()
    cCtx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2)
    cCtx.fill()
  }

  const cobbleMap = new THREE.CanvasTexture(cobbleCanvas)
  cobbleMap.wrapS = cobbleMap.wrapT = THREE.RepeatWrapping
  cobbleMap.repeat.set(9, 24)
  cobbleMap.colorSpace = THREE.SRGBColorSpace

  const cobbleBumpMap = new THREE.CanvasTexture(cobbleBumpCanvas)
  cobbleBumpMap.wrapS = cobbleBumpMap.wrapT = THREE.RepeatWrapping
  cobbleBumpMap.repeat.set(9, 24)

  const cobbleRoughnessMap = new THREE.CanvasTexture(roughCanvas)
  cobbleRoughnessMap.wrapS = cobbleRoughnessMap.wrapT = THREE.RepeatWrapping
  cobbleRoughnessMap.repeat.set(9, 24)

  // 2. 512x512 Weathered New England Clapboard Wood + Bump
  const [woodCanvas, wCtx] = makeCanvas(512, 512)
  const [woodBumpCanvas, wbCtx] = makeCanvas(512, 512)
  const randW = seededRand(404)
  wCtx.fillStyle = '#24231f'
  wCtx.fillRect(0, 0, 512, 512)
  wbCtx.fillStyle = '#202020'
  wbCtx.fillRect(0, 0, 512, 512)

  for (let y = 0; y < 512; y += 24) {
    const shade = 44 + Math.floor(randW() * 24)
    const plankGrad = wCtx.createLinearGradient(0, y, 0, y + 22)
    plankGrad.addColorStop(0, `rgb(${shade + 12}, ${shade + 10}, ${shade + 5})`)
    plankGrad.addColorStop(1, `rgb(${shade - 6}, ${shade - 4}, ${shade - 8})`)
    wCtx.fillStyle = plankGrad
    wCtx.fillRect(0, y, 512, 21)

    // Seam shadow
    wCtx.fillStyle = '#0c1010'
    wCtx.fillRect(0, y + 21, 512, 3)

    // Clapboard bump gradient
    const bGrad = wbCtx.createLinearGradient(0, y, 0, y + 24)
    bGrad.addColorStop(0, '#c8c8c8')
    bGrad.addColorStop(0.84, '#606060')
    bGrad.addColorStop(0.88, '#101010')
    bGrad.addColorStop(1, '#101010')
    wbCtx.fillStyle = bGrad
    wbCtx.fillRect(0, y, 512, 24)

    // Vertical wood grain & green salt-moss streaks
    for (let g = 0; g < 16; g++) {
      wCtx.fillStyle = `rgba(18, 36, 28, ${0.14 + randW() * 0.22})`
      wCtx.fillRect(randW() * 512, y + randW() * 14, 24 + randW() * 68, 3)
    }
  }

  const woodMap = new THREE.CanvasTexture(woodCanvas)
  woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping
  woodMap.repeat.set(2, 2)
  woodMap.colorSpace = THREE.SRGBColorSpace

  const woodBumpMap = new THREE.CanvasTexture(woodBumpCanvas)
  woodBumpMap.wrapS = woodBumpMap.wrapT = THREE.RepeatWrapping
  woodBumpMap.repeat.set(2, 2)

  // 3. 512x512 Damp Mossy Innsmouth Stone + Bump
  const [stoneCanvas, sCtx] = makeCanvas(512, 512)
  const [stoneBumpCanvas, sbCtx] = makeCanvas(512, 512)
  const randS = seededRand(777)
  sCtx.fillStyle = '#1b2425'
  sCtx.fillRect(0, 0, 512, 512)
  sbCtx.fillStyle = '#181818'
  sbCtx.fillRect(0, 0, 512, 512)

  for (let r = 0; r < 10; r++) {
    const off = (r % 2) * 44
    for (let c = -1; c < 7; c++) {
      const shade = 44 + Math.floor(randS() * 30)
      sCtx.fillStyle = `rgb(${shade}, ${shade + 9}, ${shade + 10})`
      sCtx.beginPath()
      sCtx.roundRect(c * 88 + off + 3, r * 51 + 3, 82, 45, 5)
      sCtx.fill()

      const bv = 140 + Math.floor(randS() * 85)
      sbCtx.fillStyle = `rgb(${bv}, ${bv}, ${bv})`
      sbCtx.beginPath()
      sbCtx.roundRect(c * 88 + off + 4, r * 51 + 4, 80, 43, 4)
      sbCtx.fill()

      if (randS() > 0.45) {
        sCtx.fillStyle = 'rgba(28, 78, 58, 0.28)'
        sCtx.fillRect(c * 88 + off + 8, r * 51 + 28, 28 + randS() * 36, 14)
      }
    }
  }

  const stoneMap = new THREE.CanvasTexture(stoneCanvas)
  stoneMap.wrapS = stoneMap.wrapT = THREE.RepeatWrapping
  stoneMap.repeat.set(2, 2)
  stoneMap.colorSpace = THREE.SRGBColorSpace

  const stoneBumpMap = new THREE.CanvasTexture(stoneBumpCanvas)
  stoneBumpMap.wrapS = stoneBumpMap.wrapT = THREE.RepeatWrapping
  stoneBumpMap.repeat.set(2, 2)

  // 4. Slate Roof Shingles
  const [roofCanvas, rfCtx] = makeCanvas(256, 256)
  const randR = seededRand(999)
  rfCtx.fillStyle = '#12181c'
  rfCtx.fillRect(0, 0, 256, 256)
  for (let r = 0; r < 12; r++) {
    const off = (r % 2) * 16
    for (let c = -1; c < 9; c++) {
      const shade = 28 + Math.floor(randR() * 20)
      rfCtx.fillStyle = `rgb(${shade}, ${shade + 5}, ${shade + 10})`
      rfCtx.fillRect(c * 32 + off + 1, r * 22 + 1, 30, 19)
    }
  }
  const roofMap = new THREE.CanvasTexture(roofCanvas)
  roofMap.wrapS = roofMap.wrapT = THREE.RepeatWrapping
  roofMap.repeat.set(3, 3)
  roofMap.colorSpace = THREE.SRGBColorSpace

  // 5. Black Harbor Water Ripples
  const [waterCanvas, wtCtx] = makeCanvas(256, 256)
  const randWt = seededRand(313)
  wtCtx.fillStyle = '#040d10'
  wtCtx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 110; i++) {
    wtCtx.strokeStyle = `rgba(48, 118, 106, ${0.1 + randWt() * 0.2})`
    wtCtx.lineWidth = 1 + randWt() * 2.2
    wtCtx.beginPath()
    const y = randWt() * 256
    wtCtx.moveTo(0, y)
    wtCtx.bezierCurveTo(85, y + (randWt() - 0.5) * 18, 170, y + (randWt() - 0.5) * 18, 256, y)
    wtCtx.stroke()
  }
  const waterMap = new THREE.CanvasTexture(waterCanvas)
  waterMap.wrapS = waterMap.wrapT = THREE.RepeatWrapping
  waterMap.repeat.set(16, 16)
  waterMap.colorSpace = THREE.SRGBColorSpace

  // 6. Eldritch Ritual Sigil
  const [runeCanvas, rnCtx] = makeCanvas(256, 256)
  rnCtx.clearRect(0, 0, 256, 256)
  rnCtx.strokeStyle = '#52f7be'
  rnCtx.lineWidth = 4
  rnCtx.beginPath()
  rnCtx.arc(128, 128, 108, 0, Math.PI * 2)
  rnCtx.stroke()
  rnCtx.lineWidth = 2.5
  rnCtx.beginPath()
  rnCtx.arc(128, 128, 82, 0, Math.PI * 2)
  rnCtx.stroke()
  for (let i = 0; i < 7; i++) {
    const a1 = (i / 7) * Math.PI * 2
    const a2 = (((i + 3) % 7) / 7) * Math.PI * 2
    rnCtx.beginPath()
    rnCtx.moveTo(128 + Math.cos(a1) * 104, 128 + Math.sin(a1) * 104)
    rnCtx.lineTo(128 + Math.cos(a2) * 104, 128 + Math.sin(a2) * 104)
    rnCtx.stroke()
  }
  const runeMap = new THREE.CanvasTexture(runeCanvas)
  runeMap.colorSpace = THREE.SRGBColorSpace

  // 7. Smooth Radial Mist Texture (high smoothness, subtle alpha to avoid flat streaks)
  const [mistCanvas, msCtx] = makeCanvas(256, 256)
  const mistGrad = msCtx.createRadialGradient(128, 128, 6, 128, 128, 124)
  mistGrad.addColorStop(0, 'rgba(105, 165, 152, 0.24)')
  mistGrad.addColorStop(0.45, 'rgba(60, 112, 104, 0.12)')
  mistGrad.addColorStop(1, 'rgba(8, 20, 22, 0)')
  msCtx.fillStyle = mistGrad
  msCtx.fillRect(0, 0, 256, 256)
  const mistMap = new THREE.CanvasTexture(mistCanvas)
  mistMap.colorSpace = THREE.SRGBColorSpace

  // 8. Greenish Eldritch Moon Texture
  const [moonCanvas, mnCtx] = makeCanvas(256, 256)
  const randMn = seededRand(1928)
  mnCtx.fillStyle = '#a4f5ca'
  mnCtx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 55; i++) {
    const cx = randMn() * 256
    const cy = randMn() * 256
    const rad = 6 + randMn() * 28
    mnCtx.fillStyle = `rgba(34, 96, 70, ${0.14 + randMn() * 0.24})`
    mnCtx.beginPath()
    mnCtx.arc(cx, cy, rad, 0, Math.PI * 2)
    mnCtx.fill()
  }
  const moonMap = new THREE.CanvasTexture(moonCanvas)
  moonMap.colorSpace = THREE.SRGBColorSpace

  // 9. Soft Volumetric Lighthouse Beam Gradient (fades smoothly to 0 along length!)
  const [beamCanvas, bmCtx] = makeCanvas(128, 256)
  const beamGrad = bmCtx.createLinearGradient(0, 0, 0, 256)
  beamGrad.addColorStop(0, 'rgba(185, 255, 205, 0.65)')
  beamGrad.addColorStop(0.28, 'rgba(110, 235, 175, 0.26)')
  beamGrad.addColorStop(0.7, 'rgba(65, 180, 138, 0.07)')
  beamGrad.addColorStop(1, 'rgba(30, 100, 80, 0)')
  bmCtx.fillStyle = beamGrad
  bmCtx.fillRect(0, 0, 128, 256)
  const beamGradMap = new THREE.CanvasTexture(beamCanvas)
  beamGradMap.colorSpace = THREE.SRGBColorSpace

  // 10. Window panes & authentic Innsmouth signs
  const windowLitGreenMap = createWindowTexture('#44a878', '#b8ffd2')
  const windowLitAmberMap = createWindowTexture('#b87836', '#ffe0a6')
  const windowDarkMap = createWindowTexture(null, null)

  const signGilmanMap = createSignTexture('GILMAN HOUSE', 'Hôtel · Port d’Innsmouth')
  const signDagonMap = createSignTexture('ORDRE DE DAGON', 'Sanctuaire Ésotérique')
  const signQuayMap = createSignTexture('QUAI DU PHARE', 'Récif du Diable →')

  cachedSet = {
    cobbleMap,
    cobbleBumpMap,
    cobbleRoughnessMap,
    woodMap,
    woodBumpMap,
    stoneMap,
    stoneBumpMap,
    roofMap,
    waterMap,
    runeMap,
    mistMap,
    moonMap,
    windowLitGreenMap,
    windowLitAmberMap,
    windowDarkMap,
    beamGradMap,
    signGilmanMap,
    signDagonMap,
    signQuayMap,
  }
  return cachedSet
}
