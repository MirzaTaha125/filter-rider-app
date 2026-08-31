import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, AlertTriangle, ShieldAlert, Search, ChevronRight,
} from 'lucide-react'
import { getDisputes } from '../../../api/disputes.js'
import {
  DISPUTE_STATUSES,
  DISPUTE_TYPES,
  STATUS_LABELS,
  enumLabel,
  statusTone,
  partyName,
  formatDate,
} from './disputes.js'
import './DisputeManagement.css'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function DisputeManagement() {
  const navigate = useNavigate()

  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [type, setType] = useState('ALL')

  const load = useCallback(async () => {
    setError('')
    try {
      setDisputes(toArray(await getDisputes()))
    } catch (err) {
      setError(err.message || 'Failed to load disputes')
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const term = search.trim().toLowerCase()
  const visible = disputes.filter(d => {
    if (status !== 'ALL' && d.status !== status) return false
    if (type !== 'ALL' && d.type !== type) return false
    if (!term) return true
    return (
      (d.dispute_code || '').toLowerCase().includes(term) ||
      (d.order?.order_no || '').toLowerCase().includes(term) ||
      partyName(d.customer).toLowerCase().includes(term) ||
      partyName(d.provider).toLowerCase().includes(term)
    )
  })

  const openCount = disputes.filter(
    d => d.status === 'PENDING' || d.status === 'UNDER_REVIEW',
  ).length

  return (
    <div className="dispute-management">
      <header className="dm-header">
        <div>
          <h1 className="dm-title">Disputes</h1>
          <p className="dm-subtitle">Complaints raised by customers and service providers.</p>
        </div>
      </header>

      <div className="dm-stats">
        <div className="dm-stat">
          <span className="dm-stat-label">Open disputes</span>
          <span className="dm-stat-value">{loading ? '—' : openCount}</span>
        </div>
        <div className="dm-stat">
          <span className="dm-stat-label">Total</span>
          <span className="dm-stat-value">{loading ? '—' : disputes.length}</span>
        </div>
      </div>

      <div className="dm-toolbar">
        <div className="dm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by code, order, or party…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="dm-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          {DISPUTE_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select className="dm-filter" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ALL">All types</option>
          {DISPUTE_TYPES.map(t => (
            <option key={t} value={t}>{enumLabel(t)}</option>
          ))}
        </select>
        <span className="dm-count">
          {loading ? '—' : `${visible.length} of ${disputes.length}`}
        </span>
      </div>

      {error && (
        <div className="dm-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="dm-state">
          <Loader2 size={32} className="spin" />
          <span>Loading disputes…</span>
        </div>
      ) : disputes.length === 0 ? (
        <div className="dm-state">
          <ShieldAlert size={32} />
          <h2>No disputes</h2>
          <p>Nothing has been raised yet.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="dm-state">
          <Search size={32} />
          <h2>No matches</h2>
          <p>No disputes match the current search or filters.</p>
        </div>
      ) : (
        <div className="dm-table-card">
          <div className="dm-table-wrap">
            <table className="dm-table">
              <thead>
                <tr>
                  <th>Dispute</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>Opened</th>
                  <th>Status</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {visible.map(dispute => (
                  <tr
                    key={dispute.id}
                    className="dm-row"
                    onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/admin/disputes/${dispute.id}`)
                      }
                    }}
                  >
                    <td className="dm-code">{dispute.dispute_code}</td>
                    <td className="dm-muted">{dispute.order?.order_no || '—'}</td>
                    <td>{partyName(dispute.customer)}</td>
                    <td>{partyName(dispute.provider)}</td>
                    <td className="dm-muted">{enumLabel(dispute.type)}</td>
                    <td className="dm-muted">{formatDate(dispute.created_at)}</td>
                    <td>
                      <span className={`dm-badge dm-badge--${statusTone(dispute.status)}`}>
                        {STATUS_LABELS[dispute.status] ?? dispute.status}
                      </span>
                    </td>
                    <td className="dm-chevron"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default DisputeManagement
