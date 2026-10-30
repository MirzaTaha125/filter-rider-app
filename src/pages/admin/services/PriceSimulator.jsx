import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2, Calculator, Info } from 'lucide-react'
import {
  getVehicleTypes,
  getVehicleSizes,
  getServices,
  getPriceQuote,
} from '../../../api'
import '../adminForm.css'
import './PriceSimulator.css'
import { PageShimmer } from '../../../components/Shimmer/Shimmer'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function money(value) {
  return Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Admin check of what a booking would cost: pick a vehicle type (optional,
 * it fills in the size) or a size, a service and its add-ons. The total comes
 * from the API so it matches the stored prices exactly.
 */
function PriceSimulator() {
  const [types, setTypes] = useState([])
  const [sizes, setSizes] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [typeId, setTypeId] = useState('')
  const [sizeId, setSizeId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [addonIds, setAddonIds] = useState([])

  // The last answer from the API, tagged with the selection it was for.
  const [result, setResult] = useState({ key: '', quote: null, error: '' })

  useEffect(() => {
    let cancelled = false
    Promise.all([getVehicleTypes(), getVehicleSizes(), getServices(null, true)])
      .then(([typeList, sizeList, serviceList]) => {
        if (cancelled) return
        setTypes(toArray(typeList).filter(t => t.is_active && t.vehicle_size?.is_active))
        setSizes(toArray(sizeList).filter(s => s.is_active))
        setServices(toArray(serviceList).filter(s => s.is_active))
      })
      .catch(err => { if (!cancelled) setLoadError(err.message || 'Failed to load the simulator') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Re-quote whenever the selection changes. Add-ons not priced for the new
  // size drop out of the list, so they are also dropped from the selection.
  const addonKey = addonIds.join(',')
  const requestKey = serviceId && sizeId ? `${serviceId}|${sizeId}|${addonKey}` : ''
  useEffect(() => {
    // Without both, the panel shows its empty state and ignores any old quote.
    if (!requestKey) return
    let cancelled = false
    getPriceQuote({ serviceId, vehicleSizeId: sizeId, addonIds: addonKey ? addonKey.split(',') : [] })
      .then(quote => {
        if (cancelled) return
        setResult({ key: requestKey, quote, error: '' })
        const offered = new Set(toArray(quote?.addons).map(a => a.id))
        setAddonIds(prev => {
          const kept = prev.filter(id => offered.has(id))
          return kept.length === prev.length ? prev : kept
        })
      })
      .catch(err => {
        if (!cancelled) setResult({ key: requestKey, quote: null, error: err.message || 'Failed to work out the price' })
      })
    return () => { cancelled = true }
  }, [requestKey, serviceId, sizeId, addonKey])

  // While a new selection loads, keep showing the previous quote.
  const quoting = Boolean(requestKey) && result.key !== requestKey
  const quote = result.quote
  const quoteError = result.key === requestKey ? result.error : ''

  const selectedType = types.find(t => t.id === typeId)
  const sizeName = useMemo(() => sizes.find(s => s.id === sizeId)?.name ?? '', [sizes, sizeId])

  const chooseType = (id) => {
    setTypeId(id)
    const type = types.find(t => t.id === id)
    if (type) setSizeId(type.vehicle_size_id)
  }

  const chooseSize = (id) => {
    setSizeId(id)
    // A size picked by hand that differs from the type's size clears the type.
    if (selectedType && selectedType.vehicle_size_id !== id) setTypeId('')
  }

  const toggleAddon = (id) => {
    setAddonIds(prev => (prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]))
  }

  if (loading) {
    return <div className="price-simulator"><PageShimmer /></div>
  }

  if (loadError) {
    return (
      <div className="price-simulator">
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load the price simulator</h2>
          <p>{loadError}</p>
        </div>
      </div>
    )
  }

  const addons = toArray(quote?.addons)

  return (
    <div className="price-simulator">
      <p className="ps-subtitle">Check what a customer would pay for a service, by vehicle type or size, with add-ons.</p>

      <div className="ps-layout">
        <section className="sf-card">
          <header className="sf-card-head">
            <h2>Choose</h2>
            <p>Pick a vehicle type to fill in its size, or pick the size directly.</p>
          </header>

          <div className="sf-field">
            <label htmlFor="ps-type">Vehicle type <span className="ps-optional">(optional)</span></label>
            <select id="ps-type" value={typeId} onChange={(e) => chooseType(e.target.value)}>
              <option value="">Any vehicle type</option>
              {types.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            {selectedType ? (
              <span className="sf-hint ps-detected">
                Detected size: <strong>{selectedType.vehicle_size?.name}</strong>
              </span>
            ) : types.length === 0 ? (
              <span className="sf-hint">
                No vehicle types yet. <Link to="/admin/assets/vehicle-types/add">Add one</Link> to pick by type.
              </span>
            ) : null}
          </div>

          <div className="sf-field">
            <label htmlFor="ps-size">Size <span className="sf-req">*</span></label>
            <select id="ps-size" value={sizeId} onChange={(e) => chooseSize(e.target.value)}>
              <option value="">Select a size…</option>
              {sizes.map(size => (
                <option key={size.id} value={size.id}>{size.name}</option>
              ))}
            </select>
          </div>

          <div className="sf-field">
            <label htmlFor="ps-service">Service <span className="sf-req">*</span></label>
            <select id="ps-service" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setAddonIds([]) }}>
              <option value="">Select a service…</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>{service.name_en}</option>
              ))}
            </select>
          </div>

          <div className="sf-field">
            <label id="ps-addons-label">Add-ons <span className="ps-optional">(only those priced for this size)</span></label>
            {!serviceId || !sizeId ? (
              <span className="sf-hint">Choose a size and a service to see their add-ons.</span>
            ) : addons.length === 0 ? (
              <span className="sf-hint">{quoting ? 'Loading…' : `No add-ons are priced for ${sizeName || 'this size'}.`}</span>
            ) : (
              <div className="ps-addons" role="group" aria-labelledby="ps-addons-label">
                {addons.map(addon => {
                  const checked = addonIds.includes(addon.id)
                  return (
                    <label key={addon.id} className={`ps-addon ${checked ? 'is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAddon(addon.id)}
                        disabled={!quote?.available}
                      />
                      <span className="ps-addon-name">{addon.name_en}</span>
                      <span className="ps-addon-price">
                        <span className="riyal-symbol">&#x20C1;</span>{money(addon.price)}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="sf-card ps-total-card" aria-live="polite">
          <header className="ps-total-head">
            <h2>Live total</h2>
            {quoting && <Loader2 size={16} className="spin" aria-label="Updating" />}
          </header>

          {quoteError && (
            <div className="sf-alert"><AlertTriangle size={16} /><span>{quoteError}</span></div>
          )}

          {!serviceId || !sizeId ? (
            <div className="ps-empty">
              <Calculator size={28} />
              <p>Choose a size and a service to see the price.</p>
            </div>
          ) : quote && (
            <>
              {quote.available ? (
                <ul className="ps-lines">
                  {toArray(quote.lines).map(line => (
                    <li key={`${line.kind}-${line.id}`} className={`ps-line ps-line--${line.kind.toLowerCase()}`}>
                      <span className="ps-line-label">
                        {line.label} <span className="ps-line-size">({quote.vehicle_size?.name})</span>
                      </span>
                      <span className="ps-line-dots" aria-hidden="true" />
                      <span className="ps-line-price">
                        <span className="riyal-symbol">&#x20C1;</span>{money(line.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="ps-total">
                <span>Total</span>
                <strong>
                  {quote.total == null ? '—' : <><span className="riyal-symbol">&#x20C1;</span>{money(quote.total)}</>}
                </strong>
              </div>

              {quote.message && (
                <div className={`ps-note ${quote.available ? '' : 'is-blocking'}`}>
                  <Info size={15} />
                  <span>{quote.message}</span>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default PriceSimulator
