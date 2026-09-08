export const CAR_TYPES = [
  { value: 'SEDAN', label: 'Sedan' },
  { value: 'HATCHBACK', label: 'Hatchback' },
  { value: 'SUV', label: 'SUV' },
  { value: 'CROSSOVER', label: 'Crossover' },
  { value: 'COUPE', label: 'Coupe' },
  { value: 'CONVERTIBLE', label: 'Convertible' },
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'VAN', label: 'Van' },
  { value: 'MINIVAN', label: 'Minivan' },
  { value: 'WAGON', label: 'Wagon' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'LUXURY', label: 'Luxury' },
  { value: 'TRUCK', label: 'Truck' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'OTHER', label: 'Other' },
]

export function toCarTypes(size) {
  if (Array.isArray(size?.car_types)) return size.car_types.filter(Boolean)
  if (size?.car_type) return [size.car_type]
  return []
}

export function carTypeLabel(value) {
  if (!value) return '—'
  return CAR_TYPES.find((t) => t.value === value)?.label ?? value
}

export function carTypesLabel(values) {
  const list = Array.isArray(values) ? values : values ? [values] : []
  if (!list.length) return '—'
  return list.map(carTypeLabel).join(', ')
}

export function sizeCategoryLabel(size) {
  if (!size) return '—'
  const types = carTypesLabel(toCarTypes(size))
  if (types === '—') return size.name ?? '—'
  return `${size.name} · ${types}`
}
