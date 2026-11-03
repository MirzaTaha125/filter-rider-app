import { Link } from 'react-router-dom'

function money(value) {
  const n = Number(value)
  return Number.isNaN(n) ? '0.00' : n.toFixed(2)
}

function Riyal({ value }) {
  return <><span className="riyal-symbol">&#x20C1;</span>{money(value)}</>
}

/**
 * One price box per vehicle size. An empty box means the service is not
 * offered for that size.
 *
 * rows:   [{ vehicle_size_id, name, code, is_active }]
 * values: { [vehicle_size_id]: string }
 */
function ServiceSizePricing({ rows, values, errors = {}, onChange, disabled }) {
  const offeredCount = rows.filter(r => String(values[r.vehicle_size_id] ?? '').trim() !== '').length

  return (
    <section className="sf-card">
      <header className="sf-card-head">
        <h2>Pricing by size</h2>
        <p>Type a price for each vehicle size you offer. Leave a size empty if this service is not available for it.</p>
      </header>

      {rows.length > 0 && (
        <p className="sp-offer-count">
          Offered for {offeredCount} of {rows.length} size{rows.length === 1 ? '' : 's'}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="sf-extra-empty">
          No vehicle sizes yet.{' '}
          <Link to="/admin/assets/vehicle-sizes/add">Add sizes in the Vehicle Size Master</Link> to price them here.
        </p>
      ) : (
        <div className="sp-table" role="table" aria-label="Price per vehicle size">
          <div className="sp-row sp-row--head" role="row">
            <span role="columnheader">Size</span>
            <span role="columnheader">Price</span>
            <span role="columnheader" className="sp-col-pays">Customer pays</span>
          </div>

          {rows.map(row => {
            const value = String(values[row.vehicle_size_id] ?? '')
            const error = errors[row.vehicle_size_id]
            const own = value !== '' && !Number.isNaN(Number(value))
            const inputId = `size-price-${row.vehicle_size_id}`

            return (
              <div key={row.vehicle_size_id} className={`sp-row ${row.is_active ? '' : 'is-inactive'}`} role="row">
                <div className="sp-size" role="cell">
                  <label htmlFor={inputId} className="sp-size-name">{row.name}</label>
                  <span className="sp-size-meta">
                    <code>{row.code}</code>
                    <span className={`sp-status ${row.is_active ? 'is-active' : ''}`}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                </div>

                <div className="sf-field sp-price" role="cell">
                  <div className={`sf-input-affix ${own ? 'is-set' : ''}`}>
                    <span className="sf-affix riyal-symbol">&#x20C1;</span>
                    <input
                      id={inputId}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Not offered"
                      value={value}
                      onChange={(e) => onChange(row.vehicle_size_id, e.target.value)}
                      disabled={disabled}
                      aria-invalid={Boolean(error)}
                    />
                  </div>
                  {error && <span className="sp-error">{error}</span>}
                </div>

                <div className="sp-col-pays" role="cell">
                  <span className={`sp-pays ${own ? '' : 'is-off'}`}>
                    {own ? <Riyal value={value} /> : 'Not offered'}
                  </span>
                  {!own && <span className="sp-diff">Not available for this size</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ServiceSizePricing
