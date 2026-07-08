import { useState, useEffect, useCallback } from 'react'
import { MapPin, Edit, Plus, X, Save, Trash2 } from 'lucide-react'
import { getRegionalPricing, createRegionalPricing, updateRegionalPricing, deleteRegionalPricing } from '../../../api/pricing.js'
import { getZones } from '../../../api/zones.js'
import './RegionalPricing.css'

const EMPTY_FORM = { zoneId: '', basePrice: '', commissionPercent: '', isActive: true }

function RegionalPricing() {
  const [regions, setRegions] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRegion, setEditingRegion] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [regionsData, zonesData] = await Promise.all([
        getRegionalPricing(),
        getZones(),
      ])
      setRegions(regionsData)
      const zoneList = Array.isArray(zonesData) ? zonesData : (zonesData?.zones ?? zonesData?.items ?? [])
      setZones(zoneList)
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openModal = (region = null) => {
    if (region) {
      setEditingRegion(region)
      setFormData({
        zoneId:            region.zone_id || '',
        basePrice:         String(parseFloat(region.base_price) || ''),
        commissionPercent: String(parseFloat(region.commission_percent) || ''),
        isActive:          region.is_active ?? true,
      })
    } else {
      setEditingRegion(null)
      setFormData(EMPTY_FORM)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRegion(null)
    setFormData(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!formData.zoneId || !formData.basePrice) return
    setSaving(true)
    try {
      if (editingRegion) {
        const updated = await updateRegionalPricing(editingRegion.id, formData)
        setRegions(prev => prev.map(r => r.id === editingRegion.id ? updated : r))
      } else {
        const created = await createRegionalPricing(formData)
        setRegions(prev => [...prev, created])
      }
      closeModal()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this regional pricing?')) return
    try {
      await deleteRegionalPricing(id)
      setRegions(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to delete')
    }
  }

  const getZoneName = (region) =>
    region.zone?.zone_name || region.zone?.city || zones.find(z => z.id === region.zone_id)?.zone_name || '—'

  // Zones not yet assigned (only for create form)
  const assignedZoneIds = new Set(regions.map(r => r.zone_id))
  const availableZones = editingRegion ? zones : zones.filter(z => !assignedZoneIds.has(z.id))

  return (
    <div className="regional-pricing">
      <div className="regional-pricing-header-content">
        <div>
          <h1 className="regional-pricing-title">Regional Pricing</h1>
          <p className="regional-pricing-subtitle">Set different pricing and fees per city/region</p>
        </div>
        <button className="btn-add-region" onClick={() => openModal()}>
          <Plus size={18} />
          <span>Add Region</span>
        </button>
      </div>

      {error && (
        <div className="regional-error">
          {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      <div className="regional-config-section">
        <div className="config-card">
          <div className="config-card-header">
            <div className="config-icon">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="config-title">Regional Pricing</h3>
              <p className="config-description">Set different pricing and fees per city/region</p>
            </div>
          </div>

          {loading ? (
            <div className="regional-loading">Loading regional pricing...</div>
          ) : regions.length === 0 ? (
            <div className="regional-empty">No regional pricing configured yet.</div>
          ) : (
            <div className="regional-list">
              {regions.map(region => (
                <div key={region.id} className="regional-item">
                  <div className="regional-info">
                    <MapPin size={18} />
                    <span className="regional-name">{getZoneName(region)}</span>
                    {region.zone?.city && (
                      <span className="regional-city">{region.zone.city}</span>
                    )}
                  </div>
                  <div className="regional-details">
                    <span>Base: <span className="riyal-symbol">&#x20C1;</span>{parseFloat(region.base_price).toFixed(2)}</span>
                    <span>Commission: {parseFloat(region.commission_percent)}%</span>
                    {!region.is_active && <span className="region-inactive">Inactive</span>}
                  </div>
                  <div className="regional-actions">
                    <button className="btn-edit-small" onClick={() => openModal(region)}>
                      <Edit size={14} />
                      Edit
                    </button>
                    <button className="btn-delete-small" onClick={() => handleDelete(region.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Region Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content regional-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">
                  {editingRegion ? 'Edit Region' : 'Add New Region'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="regional-form">
                <div className="form-group">
                  <label>Zone *</label>
                  <select
                    className="form-select"
                    value={formData.zoneId}
                    onChange={e => setFormData(p => ({ ...p, zoneId: e.target.value }))}
                    disabled={!!editingRegion}
                  >
                    <option value="">Select a zone...</option>
                    {availableZones.map(z => (
                      <option key={z.id} value={z.id}>
                        {z.zone_name}{z.city ? ` (${z.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Base Price (<span className="riyal-symbol">&#x20C1;</span>) *</label>
                  <div className="input-with-prefix">
                    <span className="input-prefix riyal-symbol">&#x20C1;</span>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={formData.basePrice}
                      onChange={e => setFormData(p => ({ ...p, basePrice: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Commission (%)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.commissionPercent}
                      onChange={e => setFormData(p => ({ ...p, commissionPercent: e.target.value }))}
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !formData.zoneId || !formData.basePrice}
              >
                <Save size={18} />
                {saving ? 'Saving...' : editingRegion ? 'Update Region' : 'Add Region'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegionalPricing
