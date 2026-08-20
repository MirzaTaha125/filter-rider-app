import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Check, X, Phone, Mail, MapPin,
  FileText, FileCheck, Shield, Briefcase, Wrench,
} from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getProviderRequestDetails, acceptProviderRequest, rejectProviderRequest, getServices,
} from '../../../api'
import { mapProviderToRequest } from '../../../utils/spDocuments'
import { initials, formatDate } from './providers.js'
import '../adminForm.css'
import './ProviderRequestDetail.css'

const DOCUMENTS = [
  { key: 'governmentId', label: 'Government ID', icon: FileText },
  { key: 'certification', label: 'Certification', icon: FileCheck },
  { key: 'insurance', label: 'Insurance', icon: Shield },
  { key: 'businessLicense', label: 'Business license', icon: Briefcase },
]

function toArray(value) {
  if (Array.isArray(value)) return value
  return value?.items ?? value?.data ?? []
}

function ProviderRequestDetail() {
  const { requestId } = useParams()
  const navigate = useNavigate()

  const [request, setRequest] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  const [decision, setDecision] = useState('') // '' | 'accept' | 'reject'
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const raw = await getProviderRequestDetails(requestId)
      const mapped = mapProviderToRequest(raw)
      if (!mapped?.id) {
        setLoadError('Request not found')
        return
      }
      setRequest(mapped)
    } catch (err) {
      setLoadError(err.message || 'Failed to load request')
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getServices(null, true).then(list => setServices(toArray(list))).catch(() => {})
  }, [])

  const submit = async () => {
    if (decision === 'reject' && !reason.trim()) {
      setActionError('A reason is required when rejecting a request.')
      return
    }
    setBusy(true)
    setActionError('')
    try {
      if (decision === 'accept') {
        await acceptProviderRequest(requestId)
      } else {
        await rejectProviderRequest(requestId, reason.trim())
      }
      navigate('/admin/service-providers?tab=requests')
    } catch (err) {
      setActionError(err.message || `Failed to ${decision} this request`)
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="prd-page">
        <PageHeader title="Provider Request" />
        <div className="sf-state"><Loader2 size={32} className="spin" /><span>Loading…</span></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="prd-page">
        <PageHeader title="Provider Request" />
        <div className="sf-state sf-state--error">
          <AlertTriangle size={32} />
          <h2>Could not load request</h2>
          <p>{loadError}</p>
          <button
            className="sf-btn sf-btn--secondary"
            onClick={() => navigate('/admin/service-providers?tab=requests')}
          >
            Back to requests
          </button>
        </div>
      </div>
    )
  }

  const pending = String(request.status).toUpperCase() === 'PENDING'
  const requestedIds = new Set(request.serviceIds ?? [])
  const requestedServices = services.filter(s => requestedIds.has(s.id))
  const missingDocs = DOCUMENTS.filter(d => !request.documents?.[d.key])

  return (
    <div className="prd-page">
      <PageHeader
        title={request.fullName}
        subtitle={`Registration request · submitted ${request.submittedDate === '—' ? 'unknown' : formatDate(request.submittedDate)}`}
      />

      {actionError && (
        <div className="sf-alert">
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      <div className="prd-layout">
        <div className="prd-main">
          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Applicant</h2>
            </header>
            <div className="prd-applicant">
              <span className="prd-avatar">{initials(request.fullName)}</span>
              <div className="prd-applicant-body">
                <strong>{request.fullName}</strong>
                <span className="prd-meta">
                  <span><Phone size={13} /> {request.phone}</span>
                  <span><Mail size={13} /> {request.email}</span>
                  <span><MapPin size={13} /> {request.zone}</span>
                </span>
              </div>
            </div>
          </section>

          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Documents</h2>
              <p>
                {missingDocs.length === 0
                  ? 'All four documents were supplied.'
                  : `${missingDocs.length} of ${DOCUMENTS.length} documents are missing.`}
              </p>
            </header>
            <ul className="prd-docs">
              {DOCUMENTS.map((doc) => {
                const Icon = doc.icon
                const url = request.documents?.[doc.key]
                return (
                  <li key={doc.key} className={`prd-doc ${url ? '' : 'is-missing'}`}>
                    <span className="prd-doc-icon"><Icon size={16} /></span>
                    <span className="prd-doc-label">{doc.label}</span>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="prd-doc-link">
                        View
                      </a>
                    ) : (
                      <span className="prd-doc-missing">Not provided</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Requested services</h2>
              <p>What this applicant wants to offer.</p>
            </header>
            {requestedServices.length === 0 ? (
              <p className="prd-empty">
                {requestedIds.size > 0
                  ? 'The requested services could not be matched to the catalog.'
                  : 'No services were selected.'}
              </p>
            ) : (
              <div className="prd-services">
                {requestedServices.map(svc => (
                  <span key={svc.id} className="prd-service">
                    <Wrench size={13} />
                    {svc.name_en}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="prd-side">
          <section className="sf-card">
            <header className="sf-card-head">
              <h2>Decision</h2>
              <p>{pending
                ? 'Approving activates the account immediately.'
                : 'This request has already been reviewed.'}</p>
            </header>

            <div className="prd-status-row">
              <span>Status</span>
              <span className={`pr-badge pr-badge--${
                String(request.status).toUpperCase() === 'ACTIVE' ? 'success'
                  : String(request.status).toUpperCase() === 'REJECTED' ? 'danger' : 'pending'
              }`}>
                {request.status}
              </span>
            </div>

            {pending ? (
              <>
                {missingDocs.length > 0 && (
                  <div className="prd-warn">
                    <AlertTriangle size={15} />
                    <span>
                      Missing: {missingDocs.map(d => d.label).join(', ')}.
                    </span>
                  </div>
                )}

                {decision === 'reject' && (
                  <div className="sf-field">
                    <label htmlFor="reason">Reason <span className="sf-req">*</span></label>
                    <textarea
                      id="reason"
                      className="prd-reason"
                      rows={4}
                      placeholder="Why is this application unsuccessful?"
                      value={reason}
                      onChange={(e) => { setReason(e.target.value); setActionError('') }}
                      disabled={busy}
                    />
                  </div>
                )}

                {decision ? (
                  <div className="prd-actions">
                    <button
                      className="sf-btn sf-btn--secondary"
                      onClick={() => { setDecision(''); setReason('') }}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      className={`sf-btn ${decision === 'accept' ? 'prd-btn--accept' : 'prd-btn--reject'}`}
                      onClick={submit}
                      disabled={busy || (decision === 'reject' && !reason.trim())}
                    >
                      {busy
                        ? <><Loader2 size={15} className="spin" /> Working…</>
                        : decision === 'accept' ? 'Confirm approve' : 'Confirm reject'}
                    </button>
                  </div>
                ) : (
                  <div className="prd-actions">
                    <button className="sf-btn prd-btn--reject" onClick={() => setDecision('reject')}>
                      <X size={15} /> Reject
                    </button>
                    <button className="sf-btn prd-btn--accept" onClick={() => setDecision('accept')}>
                      <Check size={15} /> Approve
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                className="sf-btn sf-btn--secondary"
                onClick={() => navigate('/admin/service-providers?tab=requests')}
              >
                Back to requests
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

export default ProviderRequestDetail
