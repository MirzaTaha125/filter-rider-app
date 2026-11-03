import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react'
import Pager from '../components/DataTable/Pager'
import { usePagedRows } from '../components/DataTable/usePagedRows'
import { fetchAllPages } from '../utils/fetchAllPages'

describe('Pager (shared list footer)', () => {
  it('shows the range, the page window and rows per page like the design', () => {
    render(<Pager page={1} total={1005} limit={55} onChange={() => {}} onLimitChange={() => {}} />)
    expect(screen.getByText('Showing 1–55 of 1,005')).toBeInTheDocument()
    const pages = screen.getAllByRole('button', { name: /^Page / }).map((b) => b.textContent)
    expect(pages).toEqual(['1', '2', '19'])
    expect(screen.getByText('…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
    expect(screen.getByText('Rows per page')).toBeInTheDocument()
    // 55 is not a standard size, so it is added to the choices instead of showing a blank select.
    expect(screen.getByRole('combobox')).toHaveValue('55')
  })

  it('moves between pages and goes back to page 1 when rows per page changes', () => {
    const onChange = vi.fn()
    const onLimitChange = vi.fn()
    render(<Pager page={3} total={100} limit={20} onChange={onChange} onLimitChange={onLimitChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onChange).toHaveBeenLastCalledWith(4)
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onChange).toHaveBeenLastCalledWith(2)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '50' } })
    expect(onLimitChange).toHaveBeenCalledWith(50)
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it('the last page disables Next and shows the right range', () => {
    render(<Pager page={5} total={95} limit={20} onChange={() => {}} />)
    expect(screen.getByText('Showing 81–95 of 95')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('an empty list says so', () => {
    render(<Pager page={1} total={0} limit={20} onChange={() => {}} unit="orders" />)
    expect(screen.getByText('No orders')).toBeInTheDocument()
  })
})

describe('usePagedRows (lists loaded in full)', () => {
  const rows = Array.from({ length: 45 }, (_, i) => i + 1)

  it('slices the current page and moves through pages', () => {
    const { result } = renderHook(() => usePagedRows(rows, { defaultLimit: 20 }))
    expect(result.current.pageRows).toEqual(rows.slice(0, 20))
    expect(result.current.pagerProps).toMatchObject({ page: 1, total: 45, limit: 20 })
    act(() => result.current.pagerProps.onChange(3))
    expect(result.current.pageRows).toEqual([41, 42, 43, 44, 45])
    act(() => result.current.pagerProps.onLimitChange(50))
    expect(result.current.pagerProps.page).toBe(1)
    expect(result.current.pageRows).toHaveLength(45)
  })

  it('a new search / filter goes back to page 1', () => {
    const { result, rerender } = renderHook(
      ({ key }) => usePagedRows(rows, { defaultLimit: 10, resetKey: key }),
      { initialProps: { key: 'a' } },
    )
    act(() => result.current.pagerProps.onChange(4))
    expect(result.current.pagerProps.page).toBe(4)
    rerender({ key: 'b' })
    expect(result.current.pagerProps.page).toBe(1)
  })

  it('a shorter list keeps the last page that still exists', () => {
    const { result, rerender } = renderHook(
      ({ list }) => usePagedRows(list, { defaultLimit: 10 }),
      { initialProps: { list: rows } },
    )
    act(() => result.current.pagerProps.onChange(5))
    rerender({ list: rows.slice(0, 12) })
    expect(result.current.pagerProps.page).toBe(2)
    expect(result.current.pageRows).toEqual([11, 12])
  })

  it('works on a real page: table rows follow the pager', () => {
    function List() {
      const [items] = useState(rows)
      const { pageRows, pagerProps } = usePagedRows(items, { defaultLimit: 20 })
      return (
        <>
          <ul>{pageRows.map((n) => <li key={n}>row {n}</li>)}</ul>
          <Pager {...pagerProps} unit="rows" />
        </>
      )
    }
    render(<List />)
    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(
      ['row 41', 'row 42', 'row 43', 'row 44', 'row 45'],
    )
    expect(screen.getByText('Showing 41–45 of 45')).toBeInTheDocument()
  })
})

describe('fetchAllPages (no more silent 100-row cap)', () => {
  it('keeps reading pages until the total is reached', async () => {
    const data = Array.from({ length: 250 }, (_, i) => ({ id: i }))
    const fetchPage = vi.fn(async ({ page, limit }) => ({
      items: data.slice((page - 1) * limit, page * limit),
      meta: { total: data.length },
    }))
    const all = await fetchAllPages(fetchPage)
    expect(all).toHaveLength(250)
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('reads the orders list key too', async () => {
    const all = await fetchAllPages(async () => ({ orders: [{ id: 1 }], meta: { total: 1 } }))
    expect(all).toEqual([{ id: 1 }])
  })
})
