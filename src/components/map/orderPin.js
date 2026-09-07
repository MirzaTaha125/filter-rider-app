import orderPinImage from '../../assets/order_pending.png'

/**
 * The order map marker: the pending-customer artwork, with a small coloured
 * dot beneath it marking the actual coordinate.
 *
 * Same idea as the provider van pin. The PNG is a square bust (raised arm),
 * so it is drawn contained at its opaque bounds rather than stretched. The
 * teardrop this replaces was the position; that survives as the dot at the
 * figure's feet, which is also where the marker anchors.
 */

export const ORDER_PIN_COLOR = '#2563eb'

const FIG_W = 44
const FIG_H = 44
const DOT_R = 4.5
const GAP = 2
const W = FIG_W
const H = FIG_H + GAP + DOT_R * 2

let imagePromise = null
let cachedUrl = null

function loadImage() {
  if (imagePromise) return imagePromise
  imagePromise = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = orderPinImage
  })
  return imagePromise
}

/** Ignore the near-transparent fringe some exports leave at the edges. */
function opaqueBox(img) {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return { x: 0, y: 0, w: img.width, h: img.height }
  ctx.drawImage(img, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height)
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return { x: 0, y: 0, w: img.width, h: img.height }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

export async function orderPinDataUrl() {
  if (cachedUrl) return cachedUrl

  try {
    const img = await loadImage()
    const box = opaqueBox(img)

    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(scale, scale)

    const fit = Math.min(FIG_W / box.w, FIG_H / box.h)
    const w = box.w * fit
    const h = box.h * fit
    const dx = (FIG_W - w) / 2
    const dy = (FIG_H - h) / 2

    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 3
    ctx.shadowOffsetY = 1
    ctx.drawImage(img, box.x, box.y, box.w, box.h, dx, dy, w, h)
    ctx.restore()

    const cx = W / 2
    const cy = FIG_H + GAP + DOT_R
    ctx.beginPath()
    ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2)
    ctx.fillStyle = ORDER_PIN_COLOR
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    cachedUrl = canvas.toDataURL('image/png')
    return cachedUrl
  } catch {
    return null
  }
}

/** The Google Maps `icon` for an order, anchored on the position dot. */
export async function orderMarkerIcon(g) {
  const url = await orderPinDataUrl()
  if (!url) return null
  return {
    url,
    scaledSize: new g.Size(W, H),
    anchor: new g.Point(W / 2, H),
  }
}

export const ORDER_PIN_SRC = orderPinImage
export const ORDER_PIN_SIZE = { width: W, height: H }
