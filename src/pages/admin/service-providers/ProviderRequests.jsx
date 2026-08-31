import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Loader2, AlertTriangle, Check, X, Eye, Inbox, MapPin,
} from 'lucide-react'
import {
  getProviderRequests, acceptProviderRequest, rejectProviderRequest,
} from '../../../api'
import { mapProviderToRequest } from '../../../utils/spDocuments'
import { initials, formatDate } from './providers.js'
import './ProviderRequests.css'

const REQUEST_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

function toArray(value) {
  if (Array.isArray(value)) return value
  return value?.items ?? value?.requests ?? value?.data ?? []
}

function statusTone(status) {
  switch (String(status ?? '').toUpperCase()) {
    case 'ACTIVE': return 'success'
    case 'REJECTED': return 'danger'
    default: return 'pending'
  }
}

function ProviderRequests() {
  const navigate = useNavigate()

  const [requests, setRequests] = useState([])
  const [status, setStatus] = useState('PENDING')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // { request, type: 'accept' | 'reject' }
  const [decision, setDecision] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getProviderRequests({
        status,
        search: search.trim() || undefined,
        limit: 100,
      })
      setRequests(toArray(response).map(mapProviderToRequest))
    } catch (err) {
      setError(err.message || 'Failed to load requests')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [status, search])

  // Debounce so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  const closeDecision = () => {
    setDecision(null)
    setReason('')
  }

  const confirmDecision = async () => {
    if (!decision) return
    const { request, type } = decision

    if (type === 'reject' && !reason.trim()) {
      setError('A reason is required when rejecting a request.')
      return
    }

    setBusy(true)
    setError('')
    try {
      if (type === 'accept') {
        await acceptProviderRequest(request.id)
        setNotice(`${request.fullName} was approved and activated.`)
      } else {
        await rejectProviderRequest(request.id, reason.trim())
        setNotice(`${request.fullName} was rejected.`)
      }
      closeDecision()
      await load()
    } catch (err) {
      setError(err.message || `Failed to ${type} this request`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pr-panel">
      <div className="pr-toolbar">
        <div className="pr-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="pr-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
          {REQUEST_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <span className="pr-count">
          {loading ? '—' : `${requests.length} request${requests.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {error && (
        <div className="pr-alert pr-alert--error">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {notice && (
        <div className="pr-alert pr-alert--ok">
          <Check size={16} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading ? (
        <div className="pr-state">
          <Loader2 size={30} className="spin" />
          <span>Loading requests…</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="pr-state">
          <Inbox size={30} />
          <h3>No {REQUEST_STATUSES.find(s => s.value === status)?.label.toLowerCase()} requests</h3>
          <p>Nothing to review here right now.</p>
        </div>
      ) : (
        <div className="pr-table-card">
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Contact</th>
                  <th>Zone</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {requests.map(request => {
                  const pending = String(request.status).toUpperCase() === 'PENDING'
                  return (
                    <tr key={request.id}>
                      <td>
                        <span className="pr-applicant">
                          <span className="pr-avatar">{initials(request.fullName)}</span>
                          <strong>{request.fullName}</strong>
                        </span>
                      </td>
                      <td className="pr-contact">
                        <span>{request.phone}</span>
                        <em>{request.email}</em>
                      </td>
                      <td className="pr-muted">
                        <span className="pr-zone"><MapPin size={13} /> {request.zone}</span>
                      </td>
                      <td className="pr-muted">
                        {request.submittedDate === '—' ? '—' : formatDate(request.submittedDate)}
                      </td>
                      <td>
                        <span className={`pr-badge pr-badge--${statusTone(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        <div className="pr-actions">
                          <button
                            className="pr-btn pr-btn--ghost"
                            onClick={() => navigate(`/admin/service-providers/requests/${request.id}`)}
                          >
                            <Eye size={14} /> Review
                          </button>
                          {pending && (
                            <>
                              <button
                                className="pr-btn pr-btn--accept"
                                onClick={() => setDecision({ request, type: 'accept' })}
                              >
                                <Check size={14} /> Accept
                              </button>
                              <button
                                className="pr-btn pr-btn--reject"
                                onClick={() => setDecision({ request, type: 'reject' })}
                              >
                                <X size={14} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {decision && (
        <div className="pr-decision-overlay" role="presentation" onClick={busy ? undefined : closeDecision}>
          <div
            className="pr-decision"
            role="alertdialog"
            aria-modal="true"
            aria-label={decision.type === 'accept' ? 'Approve request' : 'Reject request'}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {decision.type === 'accept'
                ? `Approve ${decision.request.fullName}?`
                : `Reject ${decision.request.fullName}?`}
            </h3>
            <p>
              {decision.type === 'accept'
                ? 'Their account is activated immediately and they can start receiving orders.'
                : 'They are told the application was unsuccessful. A reason is required.'}
            </p>

            {decision.type === 'reject' && (
              <textarea
                className="pr-decision-input"
                rows={3}
                placeholder="Reason for rejection…"
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError('') }}
                disabled={busy}
                autoFocus
              />
            )}

            <div className="pr-decision-actions">
              <button className="pr-btn pr-btn--ghost" onClick={closeDecision} disabled={busy}>
                Cancel
              </button>
              <button
                className={`pr-btn ${decision.type === 'accept' ? 'pr-btn--accept' : 'pr-btn--reject'}`}
                onClick={confirmDecision}
                disabled={busy || (decision.type === 'reject' && !reason.trim())}
              >
                {busy
                  ? <><Loader2 size={14} className="spin" /> Working…</>
                  : decision.type === 'accept' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProviderRequests
