import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import TableScroll from '../components/DataTable/TableScroll'

/**
 * jsdom gives every element a zero width, so overflow has to be simulated by
 * stubbing the two properties the component measures.
 */
function stubSize({ scrollWidth, clientWidth }) {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get() { return this.classList?.contains('dt-table-wrap') ? scrollWidth : 0 },
  })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() { return this.classList?.contains('dt-table-wrap') ? clientWidth : 0 },
  })
}

function Table() {
  return (
    <TableScroll>
      <table className="dt-table"><tbody><tr><td>cell</td></tr></tbody></table>
    </TableScroll>
  )
}

describe('TableScroll', () => {
  beforeEach(() => {
    // The component falls back to a window listener when this is absent, which
    // is the path jsdom takes.
    vi.stubGlobal('requestAnimationFrame', (cb) => { cb(); return 0 })
  })

  afterEach(() => {
    delete HTMLElement.prototype.scrollWidth
    delete HTMLElement.prototype.clientWidth
    vi.unstubAllGlobals()
  })

  it('renders the table inside a scroll frame', () => {
    stubSize({ scrollWidth: 0, clientWidth: 0 })
    const { container } = render(<Table />)
    expect(container.querySelector('.dt-table-wrap table')).toBeTruthy()
  })

  it('shows no top bar when the table fits', () => {
    stubSize({ scrollWidth: 500, clientWidth: 500 })
    const { container } = render(<Table />)
    expect(container.querySelector('.dt-scroll-top')).toBeNull()
  })

  // Sub-pixel layout rounding routinely reports a one-pixel overflow; a bar
  // for that would show up on tables that visibly fit.
  it('ignores a one-pixel overflow', () => {
    stubSize({ scrollWidth: 501, clientWidth: 500 })
    const { container } = render(<Table />)
    expect(container.querySelector('.dt-scroll-top')).toBeNull()
  })

  it('shows a top bar when the table genuinely overflows', () => {
    stubSize({ scrollWidth: 900, clientWidth: 500 })
    const { container } = render(<Table />)
    const top = container.querySelector('.dt-scroll-top')
    expect(top).toBeTruthy()
    // The spacer is what gives the bar something to scroll.
    expect(top.firstChild.style.width).toBe('900px')
  })

  it('keeps the two bars in step, both ways', () => {
    stubSize({ scrollWidth: 900, clientWidth: 500 })
    const { container } = render(<Table />)
    const top = container.querySelector('.dt-scroll-top')
    const body = container.querySelector('.dt-table-wrap')

    act(() => {
      top.scrollLeft = 120
      fireEvent.scroll(top)
    })
    expect(body.scrollLeft).toBe(120)

    act(() => {
      body.scrollLeft = 40
      fireEvent.scroll(body)
    })
    expect(top.scrollLeft).toBe(40)
  })

  it('does not throw without ResizeObserver', () => {
    stubSize({ scrollWidth: 900, clientWidth: 500 })
    const original = globalThis.ResizeObserver
    delete globalThis.ResizeObserver
    expect(() => render(<Table />)).not.toThrow()
    if (original) globalThis.ResizeObserver = original
  })

  it('hides the duplicate bar from assistive tech', () => {
    stubSize({ scrollWidth: 900, clientWidth: 500 })
    const { container } = render(<Table />)
    expect(container.querySelector('.dt-scroll-top').getAttribute('aria-hidden'))
      .toBe('true')
    expect(screen.getByText('cell')).toBeTruthy()
  })
})
