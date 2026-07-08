/**
 * Treat key as valid only if it looks like a real Google Maps API key.
 * Avoids loading the script with placeholders/invalid keys (InvalidKeyMapError).
 */
export function isGoogleMapsKeyValid(key) {
  if (!key || typeof key !== 'string') return false
  const k = key.trim()
  if (k.length < 38) return false
  if (!k.startsWith('AIza')) return false
  const placeholders = [
    'YOUR_GOOGLE_MAPS_API_KEY',
    'your_api_key',
    'your-api-key',
    'paste_here',
    'xxx',
    'example'
  ]
  const lower = k.toLowerCase()
  if (placeholders.some((p) => lower.includes(p.toLowerCase()))) return false
  return true
}
