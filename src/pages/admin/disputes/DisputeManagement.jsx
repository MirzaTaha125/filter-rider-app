import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Search, ChevronRight,
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
import StatTile from '../../../components/StatTile/StatTile'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import './DisputeManagement.css'
import TableScroll from '../../../components/DataTable/TableScroll'

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function DisputeManagement() {
  const navigate = useNavigate()

  const [disputes, setDisputes] = useState([])
  const sort = useTableSort()
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

  const sortedDisputes = sort.apply(visible, {
    code: (d) => d.dispute_code,
    order: (d) => d.order?.order_no,
    customer: (d) => partyName(d.customer),
    provider: (d) => partyName(d.provider),
    type: (d) => d.type,
    opened: (d) => new Date(d.created_at ?? 0).getTime(),
    status: (d) => d.status,
  })

  return (
    <div className="dt-page-layout">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">Complaints raised by customers and service providers.</p>
        </div>
      </header>

      <div className="stat-tile-row">
        <StatTile
          label="Open disputes"
          value={loading ? null : openCount}
          hint="Pending & under review"
          tone={openCount > 0 ? 'warning' : undefined}
        />
        <StatTile
          label="Total disputes"
          value={loading ? null : disputes.length}
          hint="All time"
        />
      </div>

      {error && (
        <div className="dm-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="dt-card">
        <div className="dt-toolbar">
          <div className="dt-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search by code, order, or party…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="dt-toolbar-actions">
            <div className="dt-field">
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                <option value="ALL">All statuses</option>
                {DISPUTE_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="dt-field">
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
                <option value="ALL">All types</option>
                {DISPUTE_TYPES.map(t => (
                  <option key={t} value={t}>{enumLabel(t)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <TableScroll>
          <table className="dt-table" style={{ minWidth: 940 }}>
            <thead>
              <tr>
                <SortableTh sortKey="code" sort={sort}>Dispute</SortableTh>
                <SortableTh sortKey="order" sort={sort}>Order</SortableTh>
                <SortableTh sortKey="customer" sort={sort}>Customer</SortableTh>
                <SortableTh sortKey="provider" sort={sort}>Provider</SortableTh>
                <SortableTh sortKey="type" sort={sort}>Type</SortableTh>
                <SortableTh sortKey="opened" sort={sort}>Opened</SortableTh>
                <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                <th className="dt-col-actions" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="dt-state">Loading disputes…</td></tr>
              ) : disputes.length === 0 ? (
                <tr><td colSpan="8" className="dt-state">Nothing has been raised yet.</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan="8" className="dt-state">No disputes match the current search or filters.</td></tr>
              ) : (
                sortedDisputes.map(dispute => (
                  <tr
                    key={dispute.id}
                    className="is-clickable"
                    onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/admin/disputes/${dispute.id}`)
                      }
                    }}
                  >
                    <td><strong>{dispute.dispute_code}</strong></td>
                    <td className="dt-muted">{dispute.order?.order_no || '—'}</td>
                    <td>{partyName(dispute.customer)}</td>
                    <td>{partyName(dispute.provider)}</td>
                    <td className="dt-muted">{enumLabel(dispute.type)}</td>
                    <td className="dt-muted">{formatDate(dispute.created_at)}</td>
                    <td>
                      <span className={`dt-status dt-status--${statusTone(dispute.status)}`}>
                        {STATUS_LABELS[dispute.status] ?? dispute.status}
                      </span>
                    </td>
                    <td className="dt-col-actions"><ChevronRight size={16} className="dt-muted" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableScroll>

        <footer className="dt-foot">
          <span className="dt-foot-info">
            {loading ? 'Loading…' : `Showing ${visible.length} of ${disputes.length}`}
          </span>
        </footer>
      </div>
    </div>
  )
}

export default DisputeManagement
