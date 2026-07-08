import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Calendar, Tag, Loader2 } from 'lucide-react'
import { getPromotions, updatePromotionStatus, deletePromotion } from '../../../api'
import './PromotionsManagement.css'

function getTitle(title) {
  if (!title) return '—'
  if (typeof title === 'string') return title
  return title.en ?? title.ar ?? Object.values(title)[0] ?? '—'
}

function getDate(val) {
  if (!val) return null
  if (typeof val === 'string') return val
  if (val.iso || val.date) return val.iso ?? val.date
  return String(val)
}

function getDaysUntilExpiry(dateVal) {
  const dateStr = getDate(dateVal)
  if (!dateStr) return null
  const diffDays = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  return diffDays
}

function PromotionsManagement() {
  const navigate = useNavigate()
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [togglingIds, setTogglingIds] = useState(new Set())

  useEffect(() => {
    loadPromotions()
  }, [])

  async function loadPromotions() {
    setLoading(true)
    setError('')
    try {
      const data = await getPromotions()
      setPromotions(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }

  const togglePromotion = async (promo) => {
    if (togglingIds.has(promo.id)) return
    const newIsActive = !promo.is_active
    const newStatus = newIsActive ? 'ACTIVE' : 'DRAFT'
    setTogglingIds(prev => new Set(prev).add(promo.id))
    try {
      await updatePromotionStatus(promo.id, newStatus, newIsActive)
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: newIsActive, status: newStatus } : p))
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setTogglingIds(prev => { const s = new Set(prev); s.delete(promo.id); return s })
    }
  }

  const handleDelete = async (promo) => {
    if (!window.confirm(`Delete promotion "${promo.code}"?`)) return
    setPromotions(prev => prev.filter(p => p.id !== promo.id))
    try {
      await deletePromotion(promo.id)
    } catch (err) {
      setError(err.message || 'Failed to delete promotion')
      loadPromotions()
    }
  }

  return (
    <div className="promotions-management">
      <div className="promotions-header">
        <div className="promotions-header-content">
          <div>
            <h1 className="promotions-title">Promotions & Coupons</h1>
            <p className="promotions-subtitle">Manage discount codes and promotional campaigns</p>
          </div>
          <button
            className="btn-add-coupon"
            onClick={() => navigate('/admin/promotions/create')}
          >
            <Plus size={18} />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {error && <p className="api-error" style={{ margin: '0 0 16px' }}>{error}</p>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '32px 0', color: '#6b7280' }}>
          <Loader2 size={20} className="spin" />
          <span>Loading promotions...</span>
        </div>
      ) : promotions.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#6b7280' }}>
          No promotions yet. Create your first coupon.
        </div>
      ) : (
        <div className="coupons-grid">
          {promotions.map((promo) => {
            const daysUntilExpiry = getDaysUntilExpiry(promo.valid_to)
            const usageCount = promo.usage_count ?? 0
            const usageLimit = promo.total_usage_limit ?? null
            const usagePercentage = usageLimit ? Math.min((usageCount / usageLimit) * 100, 100) : 0
            const discountValue = parseFloat(promo.discount_value ?? 0)

            return (
              <div key={promo.id} className="coupon-card">
                <div className="coupon-top-section">
                  <div className="coupon-left">
                    <div className="coupon-icon-wrapper">
                      <Tag size={20} />
                    </div>
                    <div className="coupon-info">
                      <div className="coupon-code">{promo.code}</div>
                      <div className="coupon-description">
                        {getTitle(promo.title) !== '—'
                          ? getTitle(promo.title)
                          : promo.discount_type === 'PERCENTAGE'
                            ? `${discountValue}% off`
                            : <><span className="riyal-symbol">&#x20C1;</span>{discountValue} off</>
                        }
                      </div>
                    </div>
                  </div>
                  <div className="coupon-right">
                    {togglingIds.has(promo.id) ? (
                      <div className="toggle-loading">
                        <Loader2 size={20} className="spin" />
                      </div>
                    ) : (
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={promo.is_active ?? false}
                          onChange={() => togglePromotion(promo)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    )}
                    <div className={`coupon-status ${promo.is_active ? 'active' : 'inactive'}`}>
                      {togglingIds.has(promo.id)
                        ? 'Updating...'
                        : (promo.status ?? (promo.is_active ? 'ACTIVE' : 'INACTIVE'))
                      }
                    </div>
                  </div>
                </div>

                {usageLimit !== null && (
                  <div className="coupon-usage-section">
                    <div className="usage-header">
                      <span className="usage-label">Usage Progress</span>
                      <span className="usage-count">{usageCount} / {usageLimit}</span>
                    </div>
                    <div className="usage-progress-bar">
                      <div className="usage-progress-fill" style={{ width: `${usagePercentage}%` }} />
                    </div>
                  </div>
                )}

                <div className="coupon-bottom-section">
                  <div className="coupon-expiry">
                    <Calendar size={16} />
                    {daysUntilExpiry === null
                      ? <span>No expiry</span>
                      : daysUntilExpiry < 0
                        ? <span style={{ color: '#ef4444' }}>Expired</span>
                        : <span>Expires in {daysUntilExpiry} days</span>
                    }
                  </div>
                  <div className="coupon-actions">
                    <button
                      className="btn-action-icon edit"
                      onClick={() => navigate(`/admin/promotions/edit/${promo.id}`)}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-action-icon delete"
                      onClick={() => handleDelete(promo)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PromotionsManagement
