import { useState, useEffect } from 'react'
import { Percent, DollarSign, Save } from 'lucide-react'
import { getPlatformFee, createPlatformFee, updatePlatformFee } from '../../../api/pricing.js'
import './FeeConfiguration.css'

const APPLICATION_LAYER_OPTIONS = [
  { value: 'SUBTOTAL_BEFORE_SURGE', label: 'Subtotal (before surge)' },
  { value: 'TOTAL_AFTER_SURGE',     label: 'Total (after surge)' },
]

const EMPTY = { commissionType: 'PERCENTAGE', commissionValue: 15, applicationLayer: 'SUBTOTAL_BEFORE_SURGE', isActive: true }

function FeeConfiguration() {
  const [feeConfig, setFeeConfig] = useState(EMPTY)
  const [hasExisting, setHasExisting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    getPlatformFee()
      .then(data => {
        setFeeConfig({
          commissionType:   data.commission_type   || 'PERCENTAGE',
          commissionValue:  parseFloat(data.commission_value) || 15,
          applicationLayer: data.application_layer || 'SUBTOTAL_BEFORE_SURGE',
          isActive:         data.is_active ?? true,
        })
        setHasExisting(true)
      })
      .catch(err => {
        if (err.status !== 404) setError(err.message || 'Failed to load fee configuration')
        // 404 = no config yet, form stays at defaults
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = hasExisting
        ? await updatePlatformFee(feeConfig)
        : await createPlatformFee(feeConfig)
      setFeeConfig({
        commissionType:   result.commission_type,
        commissionValue:  parseFloat(result.commission_value),
        applicationLayer: result.application_layer,
        isActive:         result.is_active,
      })
      setHasExisting(true)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fee-config">
        <div className="fee-config-header-content">
          <div>
            <h1 className="fee-config-title">Fee Configuration</h1>
            <p className="fee-config-subtitle">Configure platform fees and commissions</p>
          </div>
        </div>
        <div className="fee-loading">Loading configuration...</div>
      </div>
    )
  }

  return (
    <div className="fee-config">
      <div className="fee-config-header-content">
        <div>
          <h1 className="fee-config-title">Fee Configuration</h1>
          <p className="fee-config-subtitle">Configure platform fees and commissions</p>
        </div>
      </div>

      {error && <div className="fee-error">{error}</div>}
      {savedMsg && <div className="fee-saved">Configuration saved successfully.</div>}

      <div className="fee-config-section">
        <div className="config-card">
          <div className="config-card-header">
            <div className="config-icon">
              <Percent size={24} />
            </div>
            <div>
              <h3 className="config-title">Platform Commission</h3>
              <p className="config-description">Set the commission charged from service providers</p>
            </div>
          </div>
          <div className="config-form">
            <div className="form-group">
              <label>Commission Type</label>
              <select
                className="form-select"
                value={feeConfig.commissionType}
                onChange={e => setFeeConfig(p => ({ ...p, commissionType: e.target.value }))}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT_FEE">Flat Fee</option>
              </select>
            </div>
            <div className="form-group">
              <label>Commission Value</label>
              <div className="input-with-icon">
                {feeConfig.commissionType === 'PERCENTAGE' ? (
                  <Percent size={20} className="input-icon" />
                ) : (
                  <DollarSign size={20} className="input-icon" />
                )}
                <input
                  type="number"
                  className="form-input"
                  step="0.01"
                  min="0"
                  value={feeConfig.commissionValue}
                  onChange={e => setFeeConfig(p => ({ ...p, commissionValue: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Application Layer</label>
              <select
                className="form-select"
                value={feeConfig.applicationLayer}
                onChange={e => setFeeConfig(p => ({ ...p, applicationLayer: e.target.value }))}
              >
                {APPLICATION_LAYER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeeConfiguration
