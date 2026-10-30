import { useState, useEffect, useRef } from 'react'
import { Loader2, Search, X, ChevronDown, Check } from 'lucide-react'
import { getZoneCities, getZonePlace, getZoneCityAreas } from '../../../api'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

/** Debounced value (for search-as-you-type against Google). */
function useDebounced(value, ms = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/**
 * Saudi city picker backed by Google Places (through the backend). Opening it
 * shows a starting list; typing searches Google. Picking a city resolves its
 * centre and calls onChange({ place_id, name, lat, lng }).
 */
export function CityPicker({ value, fallbackName, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef(null)
  const query = useDebounced(text)

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    setError('')
    getZoneCities(query)
      .then(list => { if (alive) setOptions(toArray(list)) })
      .catch(err => { if (alive) { setOptions([]); setError(err.message || 'Could not load cities from Google') } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [open, query])

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const pick = async (option) => {
    setPicking(true)
    setError('')
    try {
      const place = await getZonePlace(option.place_id)
      onChange({ place_id: place.place_id, name: option.name || place.name, lat: place.lat, lng: place.lng })
      setOpen(false)
      setText('')
    } catch (err) {
      setError(err.message || 'Could not load this city')
    } finally {
      setPicking(false)
    }
  }

  const label = value?.name || fallbackName || ''

  return (
    <div className="zf-combo" ref={boxRef}>
      <button
        type="button"
        className={`zf-combo-trigger ${label ? '' : 'is-empty'}`}
        onClick={() => setOpen(o => !o)}
        disabled={disabled || picking}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{picking ? 'Loading city…' : label || 'Select a city'}</span>
        {picking ? <Loader2 size={16} className="spin" /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="zf-combo-panel">
          <div className="zf-combo-search">
            <Search size={15} />
            <input
              autoFocus
              type="text"
              placeholder="Search Saudi cities…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <ul className="zf-combo-list" role="listbox">
            {loading && <li className="zf-combo-note"><Loader2 size={14} className="spin" /> Searching Google…</li>}
            {!loading && error && <li className="zf-combo-note zf-combo-note--error">{error}</li>}
            {!loading && !error && options.length === 0 && (
              <li className="zf-combo-note">No cities found. Try another spelling.</li>
            )}
            {!loading && options.map(o => (
              <li key={o.place_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.place_id === o.place_id}
                  className="zf-combo-option"
                  onClick={() => pick(o)}
                >
                  <span>
                    <strong>{o.name}</strong>
                    {o.description && o.description !== o.name && <em>{o.description}</em>}
                  </span>
                  {value?.place_id === o.place_id && <Check size={15} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!open && error && <span className="sf-hint sf-hint--warn">{error}</span>}
    </div>
  )
}

/**
 * Multi-select of a city's areas (districts) from Google. The list is what
 * Google returns for the city; typing also searches Google for areas that
 * are missing from it.
 */
export function AreaPicker({ cityPlaceId, selected, onChange, disabled }) {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [extra, setExtra] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState('')
  const query = useDebounced(filter, 450)

  useEffect(() => {
    if (!cityPlaceId) { setAreas([]); return }
    let alive = true
    setLoading(true)
    setError('')
    getZoneCityAreas(cityPlaceId)
      .then(list => { if (alive) setAreas(toArray(list)) })
      .catch(err => { if (alive) { setAreas([]); setError(err.message || 'Could not load areas from Google') } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [cityPlaceId])

  const term = filter.trim().toLowerCase()
  const shown = areas.filter(a => !term || a.name.toLowerCase().includes(term))
  const selectedIds = new Set(selected.map(a => a.place_id))
  const knownIds = new Set(areas.map(a => a.place_id))

  // Areas Google did not list for the city: search for them when typing.
  useEffect(() => {
    const q = query.trim()
    if (!cityPlaceId || q.length < 2) { setExtra([]); return }
    let alive = true
    setSearching(true)
    getZoneCityAreas(cityPlaceId, q)
      .then(list => { if (alive) setExtra(toArray(list).filter(s => !knownIds.has(s.place_id))) })
      .catch(() => { if (alive) setExtra([]) })
      .finally(() => { if (alive) setSearching(false) })
    return () => { alive = false }
    // knownIds is derived from `areas`; re-run when the list itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityPlaceId, query, areas])

  const toggle = (area) => {
    if (selectedIds.has(area.place_id)) onChange(selected.filter(a => a.place_id !== area.place_id))
    else onChange([...selected, { place_id: area.place_id, name: area.name, lat: area.lat, lng: area.lng }])
  }

  const addSuggestion = async (s) => {
    setAdding(s.place_id)
    try {
      const place = await getZonePlace(s.place_id)
      const area = { place_id: place.place_id, name: s.name || place.name, lat: place.lat, lng: place.lng }
      setAreas(prev => (prev.some(a => a.place_id === area.place_id) ? prev : [...prev, area]
        .sort((a, b) => a.name.localeCompare(b.name))))
      if (!selectedIds.has(area.place_id)) onChange([...selected, area])
    } catch (err) {
      setError(err.message || 'Could not add this area')
    } finally {
      setAdding('')
    }
  }

  const selectShown = () => {
    const add = shown.filter(a => !selectedIds.has(a.place_id))
    onChange([...selected, ...add.map(a => ({ place_id: a.place_id, name: a.name, lat: a.lat, lng: a.lng }))])
  }

  if (!cityPlaceId) {
    return <p className="zf-areas-empty">Select a city first to see its areas.</p>
  }

  return (
    <div className="zf-areas">
      {selected.length > 0 && (
        <div className="zf-chips">
          {selected.map(a => (
            <span key={a.place_id} className="zf-chip">
              {a.name}
              <button type="button" onClick={() => toggle(a)} disabled={disabled} aria-label={`Remove ${a.name}`}>
                <X size={13} />
              </button>
            </span>
          ))}
          <button type="button" className="zf-link-btn" onClick={() => onChange([])} disabled={disabled}>
            Clear all
          </button>
        </div>
      )}

      <div className="zf-areas-box">
        <div className="zf-combo-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Filter or search areas…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            disabled={disabled}
          />
          {shown.length > 0 && (
            <button type="button" className="zf-link-btn" onClick={selectShown} disabled={disabled}>
              Select {term ? 'shown' : 'all'}
            </button>
          )}
        </div>

        <ul className="zf-area-list">
          {loading && <li className="zf-combo-note"><Loader2 size={14} className="spin" /> Loading areas from Google…</li>}
          {!loading && error && <li className="zf-combo-note zf-combo-note--error">{error}</li>}
          {!loading && !error && areas.length === 0 && (
            <li className="zf-combo-note">Google listed no areas for this city. Type a name above to search for it.</li>
          )}
          {!loading && shown.map(a => (
            <li key={a.place_id}>
              <label className="zf-area-option">
                <input
                  type="checkbox"
                  checked={selectedIds.has(a.place_id)}
                  onChange={() => toggle(a)}
                  disabled={disabled}
                />
                <span>{a.name}</span>
              </label>
            </li>
          ))}
          {term.length >= 2 && (searching || extra.length > 0) && (
            <li className="zf-combo-note zf-combo-note--section">
              {searching ? <><Loader2 size={14} className="spin" /> Searching Google…</> : 'More from Google'}
            </li>
          )}
          {!searching && term.length >= 2 && extra.map(s => (
            <li key={s.place_id}>
              <button
                type="button"
                className="zf-combo-option"
                onClick={() => addSuggestion(s)}
                disabled={disabled || adding === s.place_id}
              >
                <span>
                  <strong>{s.name}</strong>
                  {s.description && <em>{s.description}</em>}
                </span>
                {adding === s.place_id ? <Loader2 size={14} className="spin" /> : <span className="zf-add">Add</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <span className="sf-hint">
        {selected.length} selected{areas.length > 0 ? ` · ${areas.length} areas from Google` : ''}
      </span>
    </div>
  )
}
