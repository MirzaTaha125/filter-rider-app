import {
  Car, Home, Package, Box, ShoppingBag, Truck,
  Wrench, Droplets, Sparkles, Wind, Zap, Paintbrush,
} from 'lucide-react'

/**
 * Icons a service can be given. The `name` is what gets persisted in
 * `services.icon`, so entries must not be renamed once in use — add new ones
 * to the end instead.
 */
export const SERVICE_ICONS = [
  { name: 'Car', Icon: Car },
  { name: 'Home', Icon: Home },
  { name: 'Wrench', Icon: Wrench },
  { name: 'Droplets', Icon: Droplets },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'Wind', Icon: Wind },
  { name: 'Zap', Icon: Zap },
  { name: 'Paintbrush', Icon: Paintbrush },
  { name: 'Package', Icon: Package },
  { name: 'Box', Icon: Box },
  { name: 'ShoppingBag', Icon: ShoppingBag },
  { name: 'Truck', Icon: Truck },
]

export const DEFAULT_SERVICE_ICON = 'Wrench'

const ICON_MAP = Object.fromEntries(SERVICE_ICONS.map(({ name, Icon }) => [name, Icon]))

/** Resolve a stored icon name to a component, falling back to the default. */
export function resolveServiceIcon(name) {
  return ICON_MAP[name] ?? ICON_MAP[DEFAULT_SERVICE_ICON]
}
