import providerPinImage from '../../assets/service_provider.png'

/**
 * The service-provider map marker: the branded van, with a small coloured dot
 * beneath it marking the actual coordinate.
 *
 * Two things shape this. The artwork is a wide side-on vehicle (roughly 2.3:1),
 * so it is drawn contained at its own aspect ratio — cropping it to a circle
 * would leave nothing but the middle doors. And the plain dot this replaces
 * carried one piece of information, whether the provider is online or busy,
 * which is the whole point of the operations map; that survives as the dot at
 * the van's feet rather than being traded away for the picture.
 *
 * The marker anchors on that dot, so the van sits above the position the way a
 * vehicle sits on a road.
 */

const VAN_W = 62 // van width in css px
const VAN_H = 27 // ≈ VAN_W / 2.29, the artwork's own ratio
const DOT_R = 4.5 // availability dot radius
const GAP = 2 // between van and dot
const W = VAN_W
const H = VAN_H + GAP + DOT_R * 2

// Keyed by colour: the artwork never changes, only the availability dot.
const cache = new Map()

let imagePromise = null

function loadImage() {
  if (imagePromise) return imagePromise
  imagePromise = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = providerPinImage
  })
  return imagePromise
}

/**
 * A data URL for the marker in this availability colour, or null if the artwork
 * cannot be drawn — callers keep the plain dot rather than showing nothing.
 */
export async function providerPinDataUrl(dotColor) {
  if (cache.has(dotColor)) return cache.get(dotColor)

  try {
    const img = await loadImage()

    // Rasterised at 2× and handed back at 1× so it stays crisp on retina.
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(scale, scale)

    // Contain the van in its box, whatever the source ratio turns out to be.
    const fit = Math.min(VAN_W / img.width, VAN_H / img.height)
    const w = img.width * fit
    const h = img.height * fit

    // A soft shadow keeps the van readable over both pale roads and dark
    // satellite imagery.
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 3
    ctx.shadowOffsetY = 1
    ctx.drawImage(img, (VAN_W - w) / 2, (VAN_H - h) / 2, w, h)
    ctx.restore()

    // The dot is the real position: drawn last, on top, ringed in white.
    const cx = W / 2
    const cy = VAN_H + GAP + DOT_R
    ctx.beginPath()
    ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2)
    ctx.fillStyle = dotColor
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    const url = canvas.toDataURL('image/png')
    cache.set(dotColor, url)
    return url
  } catch {
    return null
  }
}

/** The Google Maps `icon` for a provider, anchored on the availability dot. */
export async function providerMarkerIcon(g, dotColor) {
  const url = await providerPinDataUrl(dotColor)
  if (!url) return null
  return {
    url,
    scaledSize: new g.Size(W, H),
    anchor: new g.Point(W / 2, H),
  }
}

export const PROVIDER_PIN_SIZE = { width: W, height: H }
