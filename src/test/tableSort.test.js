import { describe, it, expect } from 'vitest'
import { StrictMode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { useTableSort } from '../components/DataTable/useTableSort'

const rows = [
  { name: 'Zara', amount: 90, zone: null },
  { name: 'ahmed', amount: 1000, zone: 'Riyadh' },
  { name: 'Item 10', amount: 5, zone: '' },
  { name: 'Item 2', amount: 250, zone: 'Jeddah' },
]

const accessors = {
  name: (r) => r.name,
  amount: (r) => r.amount,
  zone: (r) => r.zone,
}

function setup(key, dir) {
  const { result } = renderHook(() => useTableSort(key, dir))
  return result
}

describe('useTableSort', () => {
  it('leaves rows alone until a column is chosen', () => {
    const result = setup()
    expect(result.current.apply(rows, accessors)).toEqual(rows)
  })

  it('ignores a column with no accessor', () => {
    const result = setup('nope')
    expect(result.current.apply(rows, accessors)).toEqual(rows)
  })

  it('sorts numbers numerically, not as text', () => {
    const result = setup('amount')
    expect(result.current.apply(rows, accessors).map((r) => r.amount))
      .toEqual([5, 90, 250, 1000])
  })

  it('sorts text case-insensitively and in natural order', () => {
    const result = setup('name')
    expect(result.current.apply(rows, accessors).map((r) => r.name))
      .toEqual(['ahmed', 'Item 2', 'Item 10', 'Zara'])
  })

  it('descending reverses the order', () => {
    const result = setup('amount', 'desc')
    expect(result.current.apply(rows, accessors).map((r) => r.amount))
      .toEqual([1000, 250, 90, 5])
  })

  it('sinks blanks to the bottom in both directions', () => {
    const asc = setup('zone')
    expect(asc.current.apply(rows, accessors).map((r) => r.zone))
      .toEqual(['Jeddah', 'Riyadh', null, ''])

    const desc = setup('zone', 'desc')
    const tail = desc.current.apply(rows, accessors).slice(-2).map((r) => r.zone)
    expect(tail).toEqual([null, ''])
  })

  it('does not mutate the array it was given', () => {
    const result = setup('amount')
    const original = [...rows]
    result.current.apply(rows, accessors)
    expect(rows).toEqual(original)
  })

  it('picks a new column ascending, then flips it on a second click', () => {
    const { result } = renderHook(() => useTableSort())

    act(() => result.current.toggle('amount'))
    expect(result.current.sortKey).toBe('amount')
    expect(result.current.sortDir).toBe('asc')

    act(() => result.current.toggle('amount'))
    expect(result.current.sortDir).toBe('desc')

    // Moving to another column starts ascending again.
    act(() => result.current.toggle('name'))
    expect(result.current.sortKey).toBe('name')
    expect(result.current.sortDir).toBe('asc')
  })

  it('survives a null row list', () => {
    const result = setup('name')
    expect(result.current.apply(null, accessors)).toEqual([])
  })

  // The app renders under StrictMode, which deliberately calls state updater
  // functions twice to surface impure ones. An updater that flipped direction
  // as a side effect flipped it twice per click and appeared not to work at
  // all, so this runs the real toggle sequence the way the app does.
  it('toggles both ways under StrictMode', () => {
    const { result } = renderHook(() => useTableSort(), { wrapper: StrictMode })

    act(() => result.current.toggle('amount'))
    expect(result.current.sortDir).toBe('asc')

    act(() => result.current.toggle('amount'))
    expect(result.current.sortDir).toBe('desc')

    act(() => result.current.toggle('amount'))
    expect(result.current.sortDir).toBe('asc')

    act(() => result.current.toggle('name'))
    expect(result.current.sortKey).toBe('name')
    expect(result.current.sortDir).toBe('asc')
  })

  it('actually reverses the rows across a toggle under StrictMode', () => {
    const { result } = renderHook(() => useTableSort(), { wrapper: StrictMode })

    act(() => result.current.toggle('amount'))
    expect(result.current.apply(rows, accessors).map((r) => r.amount))
      .toEqual([5, 90, 250, 1000])

    act(() => result.current.toggle('amount'))
    expect(result.current.apply(rows, accessors).map((r) => r.amount))
      .toEqual([1000, 250, 90, 5])
  })
})
