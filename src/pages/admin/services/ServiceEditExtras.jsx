import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import { ListRowsShimmer } from '../../../components/Shimmer/Shimmer'
import {
  getServiceAddons,
  createServiceAddon,
  updateServiceAddon,
  deleteServiceAddon,
  getVehicleSizes,
  getServiceAddonSizePrices,
  setServiceAddonSizePrices,
} from '../../../api'

const PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/

const EMPTY_ADDON = {
  name_en: '',
  name_ar: '',
  price: '',
  additional_duration: '',
  is_active: true,
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function money(value) {
  const n = Number(value)
  return Number.isNaN(n) ? '0.00' : n.toFixed(2)
}

function ServiceEditExtras({ serviceId }) {
  const [addons, setAddons] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [addonForm, setAddonForm] = useState(EMPTY_ADDON)
  const [editingAddonId, setEditingAddonId] = useState(null)
  const [addonSaving, setAddonSaving] = useState(false)
  const [addonError, setAddonError] = useState('')
  const [confirmAddon, setConfirmAddon] = useState(null)
  // Price per vehicle size for the add-on in the form. activeSizeRows is the
  // template for a new add-on; editing loads the add-on's own rows.
  const [activeSizeRows, setActiveSizeRows] = useState([])
  const [sizeRows, setSizeRows] = useState([])
  const [sizePrices, setSizePrices] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [addonList, sizes] = await Promise.all([
        getServiceAddons(serviceId, true),
        getVehicleSizes().catch(() => []),
      ])
      setAddons(toArray(addonList))
      const rows = toArray(sizes)
        .filter(s => s.is_active)
        .map(s => ({ vehicle_size_id: s.id, name: s.name, is_active: true }))
      setActiveSizeRows(rows)
      setSizeRows(rows)
    } catch (err) {
      setLoadError(err.message || 'Failed to load add-ons')
    } finally {
      setLoading(false)
    }
  }, [serviceId])

  useEffect(() => { load() }, [load])

  const resetAddonForm = () => {
    setAddonForm(EMPTY_ADDON)
    setEditingAddonId(null)
    setAddonError('')
    setSizeRows(activeSizeRows)
    setSizePrices({})
  }

  const startEditAddon = async (addon) => {
    setEditingAddonId(addon.id)
    setAddonError('')
    setAddonForm({
      name_en: addon.name_en ?? '',
      name_ar: addon.name_ar ?? '',
      price: String(addon.price ?? ''),
      additional_duration: String(addon.additional_duration ?? ''),
      is_active: addon.is_active !== false,
    })
    setSizeRows(activeSizeRows)
    setSizePrices({})
    try {
      const rows = toArray(await getServiceAddonSizePrices(addon.id))
      setSizeRows(rows)
      setSizePrices(Object.fromEntries(
        rows.filter(r => r.price != null).map(r => [r.vehicle_size_id, String(Number(r.price))]),
      ))
    } catch (err) {
      setAddonError(err.message || 'Failed to load the add-on prices per size')
    }
  }

  const saveAddon = async () => {
    const name = addonForm.name_en.trim()
    if (!name) {
      setAddonError('Add-on name (English) is required.')
      return
    }
    const price = Number(addonForm.price)
    if (addonForm.price === '' || Number.isNaN(price) || price < 0) {
      setAddonError('Price must be a valid number of 0 or more.')
      return
    }
    const duration = addonForm.additional_duration === '' ? 0 : Number(addonForm.additional_duration)
    if (!Number.isInteger(duration) || duration < 0) {
      setAddonError('Extra duration must be a whole number of 0 or more minutes.')
      return
    }
    const badSize = sizeRows.find(r => {
      const v = String(sizePrices[r.vehicle_size_id] ?? '').trim()
      return v !== '' && !PRICE_PATTERN.test(v)
    })
    if (badSize) {
      setAddonError(`Price for ${badSize.name} must be 0 or more with up to 2 decimals.`)
      return
    }

    setAddonSaving(true)
    setAddonError('')
    const payload = {
      name,
      nameAr: addonForm.name_ar.trim() || name,
      price: money(price),
      duration,
      isActive: addonForm.is_active,
    }

    try {
      let addonId = editingAddonId
      if (editingAddonId) {
        const updated = await updateServiceAddon(editingAddonId, payload)
        setAddons(prev => prev.map(a => (a.id === editingAddonId ? { ...a, ...updated } : a)))
      } else {
        const created = await createServiceAddon({ ...payload, serviceId })
        addonId = created?.id
        setAddons(prev => [created, ...prev])
      }
      if (addonId && sizeRows.length > 0) {
        await setServiceAddonSizePrices(addonId, sizeRows.map(r => {
          const v = String(sizePrices[r.vehicle_size_id] ?? '').trim()
          return { vehicle_size_id: r.vehicle_size_id, price: v === '' ? null : Number(v).toFixed(2) }
        }))
      }
      resetAddonForm()
    } catch (err) {
      setAddonError(err.message || 'Failed to save add-on')
    } finally {
      setAddonSaving(false)
    }
  }

  const deleteAddon = async (addon) => {
    try {
      await deleteServiceAddon(addon.id)
      setAddons(prev => prev.filter(a => a.id !== addon.id))
      if (editingAddonId === addon.id) resetAddonForm()
    } catch (err) {
      setAddonError(err.message || 'Failed to delete add-on')
    }
  }

  if (loading) {
    return (
      <section className="sf-card">
        <ListRowsShimmer rows={4} />
      </section>
    )
  }

  return (
    <>
      <section className="sf-card">
        <header className="sf-card-head">
          <h2>Add-ons</h2>
          <p>Optional extras the customer can add on top of this service.</p>
        </header>

        {loadError && (
          <div className="sf-alert"><span>{loadError}</span></div>
        )}

        {addons.length === 0 ? (
          <p className="sf-extra-empty">No add-ons yet.</p>
        ) : (
          <ul className="sf-extra-list">
            {addons.map(addon => (
              <li key={addon.id} className="sf-extra-row">
                <div className="sf-extra-main">
                  <span className="sf-extra-title">{addon.name_en}</span>
                  <span className="sf-extra-meta">
                    {addon.name_ar ? `${addon.name_ar} · ` : ''}
                    <span className="riyal-symbol">&#x20C1;</span>{money(addon.price)}
                    {' · '}{addon.additional_duration ?? 0} min
                    {' · '}{addon.is_active === false ? 'Inactive' : 'Active'}
                  </span>
                </div>
                <div className="sf-extra-row-actions">
                  <button
                    type="button"
                    className="dt-icon-btn"
                    onClick={() => startEditAddon(addon)}
                    title={`Edit ${addon.name_en}`}
                    aria-label={`Edit ${addon.name_en}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="dt-icon-btn dt-icon-btn--danger"
                    onClick={() => setConfirmAddon(addon)}
                    title={`Delete ${addon.name_en}`}
                    aria-label={`Delete ${addon.name_en}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {addonError && (
          <div className="sf-alert"><span>{addonError}</span></div>
        )}

        <div className="sf-grid sf-grid--2">
          <div className="sf-field">
            <label htmlFor="addon_name_en">Add-on name (English)</label>
            <input
              id="addon_name_en"
              type="text"
              placeholder="e.g. Wax Polish"
              value={addonForm.name_en}
              onChange={(e) => setAddonForm(f => ({ ...f, name_en: e.target.value }))}
              disabled={addonSaving}
            />
          </div>
          <div className="sf-field">
            <label htmlFor="addon_name_ar">Add-on name (Arabic)</label>
            <input
              id="addon_name_ar"
              type="text"
              dir="rtl"
              placeholder="تلميع الشمع"
              value={addonForm.name_ar}
              onChange={(e) => setAddonForm(f => ({ ...f, name_ar: e.target.value }))}
              disabled={addonSaving}
            />
          </div>
        </div>

        <div className="sf-grid sf-grid--2">
          <div className="sf-field">
            <label htmlFor="addon_price">Default price</label>
            <div className="sf-input-affix">
              <span className="sf-affix riyal-symbol">&#x20C1;</span>
              <input
                id="addon_price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={addonForm.price}
                onChange={(e) => setAddonForm(f => ({ ...f, price: e.target.value }))}
                disabled={addonSaving}
              />
            </div>
            <span className="sf-hint">Used on orders until bookings carry a vehicle size.</span>
          </div>
          <div className="sf-field">
            <label htmlFor="addon_duration">Extra duration</label>
            <div className="sf-input-affix sf-input-affix--suffix">
              <input
                id="addon_duration"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={addonForm.additional_duration}
                onChange={(e) => setAddonForm(f => ({ ...f, additional_duration: e.target.value }))}
                disabled={addonSaving}
              />
              <span className="sf-affix">min</span>
            </div>
          </div>
        </div>

        {sizeRows.length > 0 && (
          <div className="sf-field">
            <label>Price by size</label>
            <div className="ao-sizes">
              {sizeRows.map(row => {
                const inputId = `addon-size-${row.vehicle_size_id}`
                return (
                  <div key={row.vehicle_size_id} className="ao-size-row">
                    <label htmlFor={inputId} className="ao-size-name">
                      {row.name}
                      {!row.is_active && <span className="sp-status">Inactive</span>}
                    </label>
                    <div className={`sf-input-affix ${String(sizePrices[row.vehicle_size_id] ?? '') !== '' ? 'is-set' : ''}`}>
                      <span className="sf-affix riyal-symbol">&#x20C1;</span>
                      <input
                        id={inputId}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="Not offered"
                        value={sizePrices[row.vehicle_size_id] ?? ''}
                        onChange={(e) => setSizePrices(prev => ({ ...prev, [row.vehicle_size_id]: e.target.value }))}
                        disabled={addonSaving}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <span className="sf-hint">Leave a size empty if this add-on is not offered for it.</span>
          </div>
        )}

        <label className="sf-toggle">
          <input
            type="checkbox"
            checked={addonForm.is_active}
            onChange={(e) => setAddonForm(f => ({ ...f, is_active: e.target.checked }))}
            disabled={addonSaving}
          />
          <span className="sf-toggle-track"><span className="sf-toggle-thumb" /></span>
          <span className="sf-toggle-copy">
            <strong>Active</strong>
            <em>Inactive add-ons stay on past orders but cannot be selected on new ones.</em>
          </span>
        </label>

        <div className="sf-extra-actions">
          {editingAddonId && (
            <button type="button" className="sf-btn sf-btn--secondary" onClick={resetAddonForm} disabled={addonSaving}>
              <X size={16} /> Cancel
            </button>
          )}
          <button type="button" className="sf-btn sf-btn--primary" onClick={saveAddon} disabled={addonSaving}>
            {addonSaving ? <Loader2 size={16} className="spin" /> : editingAddonId ? <Pencil size={16} /> : <Plus size={16} />}
            {editingAddonId ? 'Save add-on' : 'Add add-on'}
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirmAddon)}
        title="Delete add-on"
        message={confirmAddon ? `Delete "${confirmAddon.name_en}"? It will no longer be offered on this service.` : ''}
        confirmLabel="Delete add-on"
        onCancel={() => setConfirmAddon(null)}
        onConfirm={() => {
          const addon = confirmAddon
          setConfirmAddon(null)
          if (addon) deleteAddon(addon)
        }}
      />
    </>
  )
}

export default ServiceEditExtras
