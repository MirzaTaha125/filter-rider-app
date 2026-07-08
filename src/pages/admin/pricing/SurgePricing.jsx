import { useState, useEffect } from 'react'
import { Settings, Save, X } from 'lucide-react'
import { getSurgeRules, saveSurgeRules } from '../../../api/pricing.js'
import './SurgePricing.css'

const DEMAND_LEVELS = ['LOW', 'NORMAL', 'HIGH']

const DEMAND_LABELS = { LOW: 'Low Demand', NORMAL: 'Normal', HIGH: 'High Demand' }

// Default rules shown when backend returns nothing
const DEFAULT_RULES = [
  { demand_level: 'LOW',    multiplier: 0.8, min_availability: 80, max_availability: 100, is_active: true },
  { demand_level: 'NORMAL', multiplier: 1.0, min_availability: 40, max_availability: 79,  is_active: true },
  { demand_level: 'HIGH',   multiplier: 1.5, min_availability: 0,  max_availability: 39,  is_active: true },
]

function getConditionText(rule) {
  if (rule.min_availability === 0) return `When SP availability < ${rule.max_availability}%`
  if (rule.max_availability >= 100) return `When SP availability > ${rule.min_availability}%`
  return `When SP availability ${rule.min_availability}–${rule.max_availability}%`
}

function SurgePricing() {
  const [surgeRules, setSurgeRules] = useState(DEFAULT_RULES)
  const [draftRules, setDraftRules] = useState(DEFAULT_RULES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    getSurgeRules()
      .then(data => {
        const rules = data.length > 0 ? data : DEFAULT_RULES
        setSurgeRules(rules)
        setDraftRules(rules.map(r => ({ ...r })))
      })
      .catch(err => setError(err.message || 'Failed to load surge rules'))
      .finally(() => setLoading(false))
  }, [])

  const openModal = () => {
    setDraftRules(surgeRules.map(r => ({ ...r })))
    setIsModalOpen(true)
  }

  const closeModal = () => setIsModalOpen(false)

  const handleRuleChange = (demand_level, field, value) => {
    setDraftRules(prev =>
      prev.map(r => r.demand_level === demand_level ? { ...r, [field]: parseFloat(value) || 0 } : r)
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const saved = await saveSurgeRules(draftRules.map(r => ({
        demand_level:     r.demand_level,
        multiplier:       r.multiplier,
        min_availability: r.min_availability,
        max_availability: r.max_availability,
        is_active:        r.is_active ?? true,
      })))
      const updated = saved.length > 0 ? saved : draftRules
      setSurgeRules(updated)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
      closeModal()
    } catch (err) {
      setError(err.message || 'Failed to save surge rules')
    } finally {
      setSaving(false)
    }
  }

  // Ensure all 3 demand levels are present in draftRules for the modal
  const orderedDraft = DEMAND_LEVELS.map(level =>
    draftRules.find(r => r.demand_level === level) ||
    { demand_level: level, multiplier: 1.0, min_availability: 0, max_availability: 100, is_active: true }
  )

  return (
    <div className="surge-pricing">
      <div className="surge-pricing-header-content">
        <div>
          <h1 className="surge-pricing-title">Surge Pricing</h1>
          <p className="surge-pricing-subtitle">Configure dynamic pricing multipliers based on demand</p>
        </div>
      </div>

      {error && <div className="surge-error">{error}</div>}
      {savedMsg && <div className="surge-saved">Surge rules saved successfully.</div>}

      <div className="surge-config-section">
        <div className="config-card">
          <div className="config-card-header">
            <div className="config-icon">
              <Settings size={24} />
            </div>
            <div>
              <h3 className="config-title">Surge Pricing Rules</h3>
              <p className="config-description">Configure dynamic pricing multipliers based on demand</p>
            </div>
          </div>

          {loading ? (
            <div className="surge-loading">Loading rules...</div>
          ) : (
            <div className="surge-rules">
              {surgeRules.map(rule => (
                <div key={rule.demand_level || rule.id} className="surge-rule-item">
                  <div className="rule-conditions">
                    <span>{getConditionText(rule)}</span>
                  </div>
                  <div className="rule-info">
                    <div className="rule-name">{DEMAND_LABELS[rule.demand_level] || rule.demand_level}</div>
                    <div className="rule-multiplier">{parseFloat(rule.multiplier).toFixed(1)}x</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="btn-save" onClick={openModal}>
            <Save size={18} />
            Configure Surge Rules
          </button>
        </div>
      </div>

      {/* Configure Surge Rules Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content surge-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">Configure Surge Rules</h2>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="surge-form">
                {orderedDraft.map(rule => (
                  <div key={rule.demand_level} className="surge-form-section">
                    <h3 className="form-section-title">{DEMAND_LABELS[rule.demand_level]}</h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Multiplier</label>
                        <div className="input-with-suffix">
                          <input
                            type="number"
                            className="form-input"
                            step="0.1"
                            min="0"
                            value={rule.multiplier}
                            onChange={e => handleRuleChange(rule.demand_level, 'multiplier', e.target.value)}
                          />
                          <span className="input-suffix">x</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Min Availability (%)</label>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          max="100"
                          value={rule.min_availability}
                          onChange={e => handleRuleChange(rule.demand_level, 'min_availability', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Max Availability (%)</label>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          max="100"
                          value={rule.max_availability}
                          onChange={e => handleRuleChange(rule.demand_level, 'max_availability', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SurgePricing
