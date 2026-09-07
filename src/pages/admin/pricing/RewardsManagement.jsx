import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Gift, Loader2, AlertTriangle, Search, Users, UserCheck,
} from 'lucide-react'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import {
  getRewardRules,
  updateRewardRuleStatus,
  deleteRewardRule,
} from '../../../api'
import './RewardsManagement.css'

const AUDIENCE_FILTERS = ['ALL', 'CUSTOMER', 'PROVIDER']

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function audienceLabel(audience) {
  return audience === 'PROVIDER' ? 'Provider' : 'Customer'
}

function ruleSummary(rule) {
  const who = rule.audience === 'PROVIDER' ? 'a provider' : 'a customer'
  const amount = Number(rule.reward_amount ?? 0)
  if (rule.trigger === 'SIGN_UP') {
    return `When ${who} signs up, credit ${amount} SAR to their wallet.`
  }
  const n = Number(rule.threshold ?? 0)
  if (rule.repeat_mode === 'EVERY_N') {
    return `When ${who} completes every ${n} orders, credit ${amount} SAR.`
  }
  return `When ${who} completes ${n} order${n === 1 ? '' : 's'}, credit ${amount} SAR.`
}

function triggerLabel(rule) {
  if (rule.trigger === 'SIGN_UP') return 'Sign-up'
  if (rule.repeat_mode === 'EVERY_N') return `Every ${rule.threshold ?? 0} orders`
  return `${rule.threshold ?? 0} order${Number(rule.threshold) === 1 ? '' : 's'} completed`
}

function RewardsManagement() {
  const navigate = useNavigate()

  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [audienceFilter, setAudienceFilter] = useState('ALL')
  const [togglingIds, setTogglingIds] = useState(new Set())
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setRules(toArray(await getRewardRules()))
    } catch (err) {
      setError(err.message || 'Failed to load reward rules')
      setRules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleRule = async (rule) => {
    if (togglingIds.has(rule.id)) return
    const nextActive = !rule.is_active

    setTogglingIds(prev => new Set(prev).add(rule.id))
    setError('')
    try {
      await updateRewardRuleStatus(rule.id, nextActive)
      setRules(prev => prev.map(r =>
        r.id === rule.id ? { ...r, is_active: nextActive } : r,
      ))
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(rule.id)
        return next
      })
    }
  }

  const askDelete = (rule) => {
    const used = rule.grant_count ?? 0
    setConfirm({
      rule,
      message: used > 0
        ? `Delete “${rule.name}”? It has been granted ${used} time${used === 1 ? '' : 's'}. Grant history for this rule will be removed.`
        : `Delete “${rule.name}”? This cannot be undone.`,
    })
  }

  const handleDelete = async (rule) => {
    const previous = rules
    setRules(list => list.filter(r => r.id !== rule.id))
    try {
      await deleteRewardRule(rule.id)
    } catch (err) {
      setRules(previous)
      setError(err.message || 'Failed to delete reward rule')
    }
  }

  const term = search.trim().toLowerCase()
  const visible = rules.filter(rule => {
    const matchesAudience = audienceFilter === 'ALL' || rule.audience === audienceFilter
    const matchesTerm =
      !term ||
      (rule.name || '').toLowerCase().includes(term) ||
      (rule.description || '').toLowerCase().includes(term)
    return matchesAudience && matchesTerm
  })

  const activeCount = rules.filter(r => r.is_active).length

  return (
    <div className="rewards-management">
      <header className="rw-header">
        <div>
          <p className="rw-subtitle">
            Wallet bonuses for customers and providers — sign-up gifts, order milestones, and more.
          </p>
        </div>
        <button
          className="rw-btn rw-btn--primary"
          onClick={() => navigate('/admin/pricing/rewards/new')}
        >
          <Plus size={18} />
          New Reward
        </button>
      </header>

      <div className="rw-toolbar">
        <div className="rw-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rw-filter"
          value={audienceFilter}
          onChange={(e) => setAudienceFilter(e.target.value)}
        >
          {AUDIENCE_FILTERS.map(s => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All audiences' : audienceLabel(s) + 's'}
            </option>
          ))}
        </select>
        <span className="rw-count">
          {loading ? '—' : `${visible.length} of ${rules.length} · ${activeCount} active`}
        </span>
      </div>

      {error && (
        <div className="rw-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="rw-state">
          <Loader2 size={32} className="spin" />
          <span>Loading rewards…</span>
        </div>
      ) : rules.length === 0 ? (
        <div className="rw-state">
          <Gift size={32} />
          <h2>No rewards yet</h2>
          <p>Create a rule to credit wallets when someone signs up or completes orders.</p>
          <button className="rw-btn rw-btn--primary" onClick={() => navigate('/admin/pricing/rewards/new')}>
            <Plus size={16} /> New Reward
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rw-state">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No reward rules match the current search or filter.</p>
        </div>
      ) : (
        <div className="rw-grid">
          {visible.map(rule => {
            const toggling = togglingIds.has(rule.id)
            const granted = rule.grant_count ?? 0
            const AudienceIcon = rule.audience === 'PROVIDER' ? UserCheck : Users

            return (
              <article key={rule.id} className={`rw-card ${rule.is_active ? '' : 'is-inactive'}`}>
                <header className="rw-card-top">
                  <span className="rw-card-icon"><Gift size={18} /></span>
                  <div className="rw-card-id">
                    <strong className="rw-name">{rule.name}</strong>
                    <span className="rw-amount">
                      <span className="riyal-symbol">&#x20C1;</span>
                      {Number(rule.reward_amount ?? 0)}
                    </span>
                  </div>
                  <span className={`rw-badge ${rule.is_active ? 'rw-badge--active' : 'rw-badge--inactive'}`}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </header>

                <p className="rw-card-title">{ruleSummary(rule)}</p>

                <div className="rw-meta">
                  <span className="rw-chip">
                    <AudienceIcon size={13} />
                    {audienceLabel(rule.audience)}
                  </span>
                  <span className="rw-chip">{triggerLabel(rule)}</span>
                  {granted > 0 && (
                    <span className="rw-chip rw-chip--muted">
                      Granted {granted} time{granted === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                <footer className="rw-card-actions">
                  <label className="rw-toggle" title={rule.is_active ? 'Deactivate' : 'Activate'}>
                    <input
                      type="checkbox"
                      checked={rule.is_active ?? false}
                      onChange={() => toggleRule(rule)}
                      disabled={toggling}
                    />
                    <span className="rw-toggle-track"><span className="rw-toggle-thumb" /></span>
                    <span className="rw-toggle-text">
                      {toggling ? 'Saving…' : rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </label>

                  <div className="rw-row-actions">
                    <button
                      className="rw-icon-btn"
                      onClick={() => navigate(`/admin/pricing/rewards/${rule.id}/edit`)}
                      title={`Edit ${rule.name}`}
                      aria-label={`Edit ${rule.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="rw-icon-btn rw-icon-btn--danger"
                      onClick={() => askDelete(rule)}
                      title={`Delete ${rule.name}`}
                      aria-label={`Delete ${rule.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete reward"
        message={confirm?.message}
        confirmLabel="Delete reward"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const pending = confirm
          setConfirm(null)
          if (pending) handleDelete(pending.rule)
        }}
      />
    </div>
  )
}

export default RewardsManagement
