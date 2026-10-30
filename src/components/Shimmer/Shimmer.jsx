import { useEffect, useRef, useState } from 'react'

function slots(count, render) {
  return Array.from({ length: count }, (_, index) => render(index))
}

export function PageShimmer() {
  return (
    <div className="shimmer-page" aria-busy="true" aria-label="Loading">
      <div className="shimmer-form-pair">
        <FormCard fields={4} />
        <FormCard fields={4} />
      </div>
      <FormCard fields={3} wide />
    </div>
  )
}

function FormCard({ fields, wide }) {
  return (
    <div className={`shimmer-sheet ${wide ? 'is-wide' : ''}`}>
      <span className="shimmer shimmer-line shimmer-line--title" />
      <div className="shimmer-fields">
        {slots(fields, (index) => (
          <span
            key={index}
            className={`shimmer shimmer-field ${wide && index === fields - 1 ? 'shimmer-field--wide' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

export function DetailShimmer() {
  return (
    <div className="shimmer-page" aria-busy="true" aria-label="Loading">
      <div className="shimmer-stat-row">
        {slots(4, (index) => (
          <div className="shimmer-stat" key={index}>
            <span className="shimmer shimmer-line shimmer-line--short" />
            <span className="shimmer shimmer-value" />
          </div>
        ))}
      </div>
      <div className="shimmer-form-pair">
        <div className="shimmer-sheet">
          <span className="shimmer shimmer-line shimmer-line--title" />
          {slots(4, (index) => <span key={index} className="shimmer shimmer-line" />)}
        </div>
        <div className="shimmer-sheet">
          <span className="shimmer shimmer-line shimmer-line--title" />
          <ListRowsShimmer rows={4} />
        </div>
      </div>
    </div>
  )
}

export function ServiceCardsShimmer({ count = 8 }) {
  return (
    <div className="sm-grid" aria-busy="true" aria-label="Loading">
      {slots(count, (index) => (
        <article className="sm-card" key={index}>
          <div className="sm-card-cover">
            <span className="shimmer shimmer-service-cover" />
          </div>
          <div className="sm-card-body">
            <div className="sm-card-names">
              <span className="shimmer shimmer-service-title" />
              <span className="shimmer shimmer-service-badge" />
            </div>
            <div className="sm-card-meta">
              <span className="shimmer shimmer-service-chip" />
              <span className="shimmer shimmer-service-duration" />
            </div>
            <div className="sm-stats">
              {slots(3, (stat) => (
                <div key={stat}>
                  <span className="shimmer shimmer-service-label" />
                  <span className="shimmer shimmer-service-value" />
                </div>
              ))}
            </div>
          </div>
          <footer className="sm-card-actions">
            <span className="shimmer shimmer-service-action" />
            <span className="shimmer shimmer-service-action" />
          </footer>
        </article>
      ))}
    </div>
  )
}

export function CategoryCardsShimmer({ count = 8 }) {
  return (
    <div className="shimmer-category-grid" aria-busy="true" aria-label="Loading">
      {slots(count, (index) => (
        <article className="shimmer-category-card" key={index}>
          <span className="shimmer shimmer-category-icon" />
          <span className="shimmer shimmer-line shimmer-line--title" />
          <span className="shimmer shimmer-line shimmer-line--short" />
        </article>
      ))}
    </div>
  )
}

export function ReviewCardsShimmer({ count = 6 }) {
  return (
    <div className="shimmer-review-grid" aria-busy="true" aria-label="Loading">
      {slots(count, (index) => (
        <article className="shimmer-review-card" key={index}>
          <div className="shimmer-service-top">
            <span className="shimmer shimmer-line shimmer-line--short" />
            <span className="shimmer shimmer-pill" />
          </div>
          <div className="shimmer-review-people">
            <span className="shimmer shimmer-review-avatar" />
            <span className="shimmer shimmer-line shimmer-line--short" />
            <span className="shimmer shimmer-review-avatar" />
            <span className="shimmer shimmer-line shimmer-line--short" />
          </div>
          <span className="shimmer shimmer-stars" />
          <span className="shimmer shimmer-line" />
          <span className="shimmer shimmer-line shimmer-line--short" />
        </article>
      ))}
    </div>
  )
}

export function ListCardsShimmer({ count = 6 }) {
  return (
    <div className="shimmer-list-grid" aria-busy="true" aria-label="Loading">
      {slots(count, (index) => (
        <article className="shimmer-list-card" key={index}>
          <div className="shimmer-service-top">
            <span className="shimmer shimmer-avatar" />
            <span className="shimmer shimmer-pill" />
          </div>
          <span className="shimmer shimmer-line shimmer-line--title" />
          <span className="shimmer shimmer-line" />
          <span className="shimmer shimmer-line shimmer-line--short" />
        </article>
      ))}
    </div>
  )
}

export function ListRowsShimmer({ rows = 6 }) {
  return (
    <div className="shimmer-list" aria-busy="true" aria-label="Loading">
      {slots(rows, (index) => (
        <div className="shimmer-list-row" key={index}>
          <span className="shimmer shimmer-avatar" />
          <span className="shimmer-list-copy">
            <span className="shimmer shimmer-line shimmer-line--title" />
            <span className="shimmer shimmer-line shimmer-line--short" />
          </span>
        </div>
      ))}
    </div>
  )
}

export function ChartShimmer() {
  const heights = [42, 68, 50, 88, 60, 76, 46, 70]
  return (
    <div className="shimmer-chart" aria-busy="true" aria-label="Loading">
      {heights.map((height, index) => (
        <span key={index} className="shimmer shimmer-bar" style={{ height: `${height}%` }} />
      ))}
    </div>
  )
}

export function PanelShimmer({ rows = 6 }) {
  return (
    <div className="shimmer-panel" aria-busy="true" aria-label="Loading">
      <span className="shimmer shimmer-line shimmer-line--title" />
      {slots(rows, (index) => (
        <span key={index} className="shimmer shimmer-field" />
      ))}
    </div>
  )
}

export function TableBlockShimmer({ columns = 6, rows = 8 }) {
  return (
    <div className="dt-card shimmer-table-card" aria-busy="true" aria-label="Loading">
      <div className="shimmer-table" style={{ '--cols': columns }}>
        <div className="shimmer-table-head">
          {slots(columns, (index) => <span key={index} className="shimmer shimmer-head" />)}
        </div>
        {slots(rows, (row) => (
          <div className="shimmer-table-row" key={row}>
            {slots(columns, (column) => <span key={column} className="shimmer shimmer-cell" />)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChatRoomsShimmer({ rows = 8 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {slots(rows, (index) => (
        <div className="cm-room cm-room-shimmer" key={index}>
          <span className="shimmer cm-shimmer-avatar" />
          <span className="cm-room-body">
            <span className="cm-room-top">
              <span className="shimmer cm-shimmer-order" />
              <span className="shimmer cm-shimmer-time" />
            </span>
            <span className="shimmer cm-shimmer-people" />
            <span className="shimmer cm-shimmer-preview" />
          </span>
        </div>
      ))}
    </div>
  )
}

export function ChatThreadShimmer() {
  const bubbles = [
    ['in', '58%'],
    ['out', '42%'],
    ['in', '66%'],
    ['in', '36%'],
    ['out', '50%'],
    ['in', '62%'],
  ]
  return (
    <div className="ct-shimmer" aria-busy="true" aria-label="Loading">
      <div className="ct-shimmer-msgs">
        {bubbles.map(([side, width], index) => (
          <span
            key={index}
            className={`shimmer ct-shimmer-bubble is-${side}`}
            style={{ width }}
          />
        ))}
      </div>
      <div className="ct-shimmer-composer">
        <span className="shimmer ct-shimmer-input" />
        <span className="shimmer ct-shimmer-send" />
      </div>
    </div>
  )
}

export function CustomerRowsShimmer({ rows = 7 }) {
  return slots(rows, (row) => (
    <tr key={row} className="shimmer-row">
      <td>
        <div className="cm-profile">
          <span className="shimmer cm-shimmer-avatar" />
          <span className="dt-cell-stack">
            <span className="shimmer cm-shimmer-name" />
            <span className="shimmer cm-shimmer-id" />
          </span>
        </div>
      </td>
      <td><span className="shimmer cm-shimmer-phone" /></td>
      <td><span className="shimmer cm-shimmer-money" /></td>
      <td><span className="shimmer cm-shimmer-status" /></td>
    </tr>
  ))
}

export function TableShimmer({ columns = 6, rows = 7 }) {
  return slots(rows, (row) => (
    <tr key={row} className="shimmer-row">
      {slots(columns, (column) => (
        <td key={column}><span className="shimmer shimmer-cell" /></td>
      ))}
    </tr>
  ))
}

export function CardGridShimmer(props) {
  return <ListCardsShimmer {...props} />
}

export function ShimmerImage({ src, alt = '' }) {
  const imgRef = useRef(null)
  const [loadedSrc, setLoadedSrc] = useState('')
  const loaded = loadedSrc === src

  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) setLoadedSrc(src)
  }, [src])

  return (
    <span className={`shimmer-image${loaded ? ' is-loaded' : ''}`}>
      {!loaded && <span className="shimmer shimmer-image-bar" aria-hidden="true" />}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoadedSrc(src)}
        onError={() => setLoadedSrc(src)}
      />
    </span>
  )
}
