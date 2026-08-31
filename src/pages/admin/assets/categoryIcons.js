import { Car, Home, Package, Box, ShoppingBag, Truck } from 'lucide-react'

export const ICON_MAP = { Car, Home, Package, Box, ShoppingBag, Truck }
export const DEFAULT_ICON = Car

export const AVAILABLE_ICONS = [
  { name: 'Car', component: Car },
  { name: 'Home', component: Home },
  { name: 'Package', component: Package },
  { name: 'Box', component: Box },
  { name: 'ShoppingBag', component: ShoppingBag },
  { name: 'Truck', component: Truck },
]

export const AVAILABLE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

export const DEFAULT_COLOR = '#3b82f6'

/** Older rows have no icon stored, so one is guessed from the name. */
export function inferIconName(name = '', nameAr = '') {
  const value = `${name} ${nameAr}`.toLowerCase()
  if (
    value.includes('home') || value.includes('clean') || value.includes('house')
    || value.includes('تنظيف') || value.includes('منزل')
  ) return 'Home'
  if (
    value.includes('box') || value.includes('package')
    || value.includes('parcel') || value.includes('delivery')
  ) return 'Package'
  if (value.includes('shop') || value.includes('bag')) return 'ShoppingBag'
  if (value.includes('truck') || value.includes('transport')) return 'Truck'
  return 'Car'
}

/** Maps an API row onto the shape both the grid and the form work with. */
export function toCategory(item) {
  const name = item.title_en || item.name
  const nameAr = item.title_ar || item.nameAr
  const iconName = item.icon || inferIconName(name, nameAr)
  return {
    id: item.id,
    name,
    nameAr,
    iconName,
    color: item.icon_color || item.color || DEFAULT_COLOR,
    icon: ICON_MAP[iconName] || DEFAULT_ICON,
    isActive: item.is_active,
  }
}
