import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, X, AlertTriangle, CheckCircle, UserCog, Filter, Package, Layers,
  Calendar, Clock, MapPin, Phone, Radio, ChevronRight,
} from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import StatTile from '../../../components/StatTile/StatTile'
import LiveTrackingMap from '../../../components/LiveTrackingMap/LiveTrackingMap'
import ChatThread from '../../../components/ChatThread/ChatThread'
import { useSocket } from '../../../contexts/SocketContext'
import { useGoogleMapsApiKey } from '../../../contexts/AppSettingsContext'
import {
  getAdminOrderDetails,
  getProviderDetails,
  getCustomerDetails,
  cancelOrder,
  reassignOrder,
  rebroadcastOrder,
  getProviders,
} from '../../../api'
import {
  getPaymentState, formatMoney, PAYMENT_TIMING_LABELS, PAYMENT_RECORD_TONES,
} from './paymentStatus'
import { normalizeStatus, orderStatusTone } from './orderStatus'
import { ORDER_PIN_SRC } from '../../../components/map/orderPin'
import './OrderDetail.css'
import TableScroll from '../../../components/DataTable/TableScroll'

/**
 * What the order *is* — service, schedule, customer, provider — used to be
 * three separate tabs, which meant hunting for facts you always want while
 * reading anything else. Those now live in the rail beside the tabs, and only
 * the genuine deep dives stay tabbed.
 */
const TABS = ['financials', 'media', 'timeline', 'tracking', 'chat']

const TAB_LABELS = {
  financials: 'Financials',
  media: 'Photos',
  timeline: 'Timeline',
  tracking: 'Live Tracking',
  chat: 'Chat',
}

/** Matches the date style already used elsewhere on this page. */
function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function initials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** One labelled fact in the record rail. */
function Fact({ icon: Icon, label, children }) {
  return (
    <div className="od-fact">
      <span className="od-fact-label">{label}</span>
      <span className="od-fact-value">
        {Icon && <Icon size={14} />}
        <span>{children}</span>
      </span>
    </div>
  )
}

function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { ordersSocket } = useSocket()
  const mapsApiKey = useGoogleMapsApiKey()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('financials')
  const [lightbox, setLightbox] = useState(null)
  // Live provider position, seeded from the provider record and then kept
  // current by the provider.location.updated websocket event.
  const [providerPos, setProviderPos] = useState(null)
  const [posUpdatedAt, setPosUpdatedAt] = useState(null)

  // Modal states
  const [confirmCancel, setConfirmCancel] = useState({ open: false })
  const [reassignState, setReassignState] = useState({ open: false, providerId: '', selectedName: '', submitting: false, error: '', spList: [], spLoading: false, spSearch: '' })
  const [messageModal, setMessageModal] = useState({ open: false, type: 'success', title: '', message: '' })

  useEffect(() => {
    loadOrderDetails()
  }, [orderId])

  async function loadOrderDetails() {
    setLoading(true)
    setError('')
    try {
      // The customer, service and provider are each fetched below once we know
      // which ids this order carries, so this is a single request.
      const details = await getAdminOrderDetails(orderId)
      if (!details) {
        setError('Failed to load order details')
        return
      }

      // Fetch customer details if needed
      if (details.customer_id || details.customer?.id) {
        try {
          const customerId = details.customer_id || details.customer?.id
          const cRes = await getCustomerDetails(customerId)
          details.customer = {
            ...(details.customer || {}),
            profile: cRes.profile || cRes,
            full_name: cRes.full_name || cRes.name,
            status: cRes.status,
          }
        } catch (err) {
          console.error('Failed to load customer:', err)
        }
      }

      // The order now arrives with its service and serviceType attached, so
      // the whole service list no longer has to be fetched to name one of them.

      // Fetch provider details if assigned
      if (details.provider_id || details.provider?.id) {
        try {
          const providerId = details.provider_id || details.provider?.id
          const pRes = await getProviderDetails(providerId)
          details.provider = {
            ...(details.provider || {}),
            _name: pRes.user?.full_name || pRes.full_name || pRes.name,
            _phone: pRes.user?.phone || pRes.phone,
            _email: pRes.user?.email || pRes.email,
            _location: pRes.location ?? null,
          }
          const lat = Number(pRes.location?.latitude)
          const lng = Number(pRes.location?.longitude)
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setProviderPos({ lat, lng })
            setPosUpdatedAt(pRes.location?.updated_at ?? null)
          }
        } catch (err) {
          console.error('Failed to load provider:', err)
        }
      }

      setOrder(details)
    } catch (err) {
      setError(err.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  // The backend fans provider.location.updated out to admins; take only the
  // events for this order.
  useEffect(() => {
    if (!ordersSocket || !orderId) return
    const onMove = (payload) => {
      if (payload?.order_id !== orderId) return
      const lat = Number(payload.latitude)
      const lng = Number(payload.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      setProviderPos({ lat, lng })
      setPosUpdatedAt(payload.updated_at ?? new Date().toISOString())
    }
    ordersSocket.on('provider.location.updated', onMove)
    return () => ordersSocket.off('provider.location.updated', onMove)
  }, [ordersSocket, orderId])

  const handleConfirmCancelOrder = async () => {
    if (!order?.id) return
    try {
      await cancelOrder(order.id)
      setConfirmCancel({ open: false })
      setMessageModal({ open: true, type: 'success', title: 'Order cancelled', message: 'The order has been cancelled successfully.' })
      setTimeout(() => loadOrderDetails(), 1000)
    } catch (err) {
      setMessageModal({ open: true, type: 'error', title: 'Cancel failed', message: err.message || 'Failed to cancel order.' })
    }
  }

  const openReassignModal = async () => {
    setReassignState({ open: true, providerId: '', selectedName: '', submitting: false, error: '', spList: [], spLoading: true, spSearch: '' })
    try {
      const res = await getProviders({ limit: 200, status: 'ACTIVE' })
      const list = Array.isArray(res) ? res : (res?.items || res?.users || res?.data || [])
      setReassignState(prev => ({ ...prev, spList: list, spLoading: false }))
    } catch {
      setReassignState(prev => ({ ...prev, spLoading: false }))
    }
  }

  const handleReassignSubmit = async (e) => {
    e.preventDefault()
    if (!order?.id || !reassignState.providerId?.trim()) {
      setReassignState(prev => ({ ...prev, error: 'Please select a provider.' }))
      return
    }
    setReassignState(prev => ({ ...prev, submitting: true, error: '' }))
    try {
      await reassignOrder(order.id, reassignState.providerId.trim())
      setReassignState({ open: false, providerId: '', selectedName: '', submitting: false, error: '', spList: [], spLoading: false, spSearch: '' })
      setMessageModal({ open: true, type: 'success', title: 'Order reassigned', message: 'The order has been reassigned successfully.' })
      setTimeout(() => loadOrderDetails(), 1000)
    } catch (err) {
      setReassignState(prev => ({ ...prev, submitting: false, error: err.message || 'Failed to reassign order.' }))
    }
  }

  const handleRebroadcast = async () => {
    if (!order?.id) return
    try {
      await rebroadcastOrder(order.id)
      setMessageModal({ open: true, type: 'success', title: 'Order rebroadcast', message: 'Order has been rebroadcasted successfully.' })
      setTimeout(() => loadOrderDetails(), 1000)
    } catch (err) {
      setMessageModal({ open: true, type: 'error', title: 'Rebroadcast failed', message: err.message || 'Failed to rebroadcast order.' })
    }
  }

  const closeMessageModal = () => setMessageModal(prev => ({ ...prev, open: false }))

  if (loading) {
    return (
      <div className="od-state">
        <Loader2 size={34} className="spin" />
        <span>Loading order…</span>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="od-state">
        <AlertTriangle size={34} />
        <h2>Could not load this order</h2>
        <p>{error || 'Order not found'}</p>
      </div>
    )
  }

  const isTerminal = order.status === 'COMPLETED' || order.status === 'CANCELLED'
  const hasProvider = Boolean(order.provider_id ?? order.provider?.id)
  const orderLat = Number(order.latitude)
  const orderLng = Number(order.longitude)
  const destinationPos = Number.isFinite(orderLat) && Number.isFinite(orderLng)
    ? { lat: orderLat, lng: orderLng }
    : null

  const status = normalizeStatus(order.status)
  const pay = getPaymentState(order)
  const cur = order.currency || 'SAR'
  const money = (v) => formatMoney(v, cur).amount

  // What the platform keeps on this order. Commission is only written to the
  // order once it settles, so before that the backend sends what the current
  // fee configuration would take — shown as an estimate rather than as a zero.
  const total = Number(order.total_price ?? 0)
  const isSettled = order.commission_basis === 'settled'
  const commission = Number(
    order.commission_amount ?? order.platform_commission_amount ?? 0,
  )
  const providerNet = Number(
    order.commission_provider_net ?? order.provider_net_amount ?? 0,
  )
  const commissionPct = total > 0 && commission > 0
    ? Math.round((commission / total) * 1000) / 10
    : null

  // The package is the ServiceType the customer picked. It used to read
  // "Standard" for every order because the endpoint never sent it — say so
  // plainly when it really is missing rather than inventing a default.
  const serviceTypeName = order.serviceType?.name_en
    ?? order.service_type?.name_en
    ?? order.category?.name_en
    ?? null
  // Plenty of rows have name_ar filled in with the English text, so only show
  // the second name when it is actually a different one.
  const serviceTypeAltRaw = order.serviceType?.name_ar ?? order.service_type?.name_ar ?? null
  const serviceTypeArabic =
    serviceTypeAltRaw && serviceTypeAltRaw.trim() !== (serviceTypeName ?? '').trim()
      ? serviceTypeAltRaw
      : null
  const customerName = order.customer?.profile?.full_name
    || order.customer?.full_name
    || '—'

  // Tracking and chat both need an assigned provider to exist.
  const visibleTabs = TABS.filter(
    (tab) => (tab !== 'tracking' && tab !== 'chat') || hasProvider,
  )

  return (
    <div className="order-detail-page">
      <PageHeader
        title={`Order ${order.order_no || order.id?.slice(0, 8)}`}
        subtitle={`Created ${formatDateTime(order.created_at)}`}
      />

      {/* ── What this order is worth, where the eye lands first ──────────── */}
      <div className="stat-tile-row">
        <StatTile label="Order total" value={Number(order.total_price ?? 0)} money />
        <StatTile
          label={isSettled ? 'Our commission' : 'Expected commission'}
          value={commission}
          money
          hint={[
            commissionPct != null ? `${commissionPct}% of the order` : null,
            isSettled ? null : 'not settled yet',
          ].filter(Boolean).join(' · ') || 'No commission configured'}
        />
        <StatTile
          label={isSettled ? 'Provider payout' : 'Expected payout'}
          value={providerNet}
          money
          hint="After commission"
        />
        <StatTile label="Add-ons" value={Number(order.addons_total ?? 0)} money hint="Extras & equipment" />
      </div>

      <div className="od-layout">
        {/* ── Record rail ──────────────────────────────────────────────── */}
        <aside className="od-rail">
          <section className="od-card">
            <div className="od-tags">
              <span className={`dt-status dt-status--${orderStatusTone(status)}`}>
                {status.replace(/_/g, ' ')}
              </span>
              <span className={`dt-dot-label dt-tone--${pay.tone}`}>
                <span className="dt-dot" />
                {pay.label}
              </span>
            </div>

            {/* Cancelling and reassigning a finished order is not a thing, so
                those only appear while the order is still live. */}
            <div className="od-actions">
              {!isTerminal && (
                <>
                  <button className="od-action is-danger" onClick={() => setConfirmCancel({ open: true })}>
                    <X size={15} /> Cancel order
                  </button>
                  <button className="od-action" onClick={openReassignModal}>
                    <UserCog size={15} /> Reassign provider
                  </button>
                  <button className="od-action" onClick={handleRebroadcast}>
                    <Radio size={15} /> Force rebroadcast
                  </button>
                </>
              )}
              {isTerminal && (
                <p className="od-terminal">
                  This order is {status.toLowerCase()} — no further action can be taken.
                </p>
              )}
            </div>
          </section>

          <section className="od-card">
            <h3 className="od-card-title">Job</h3>
            <div className="od-facts">
              <Fact icon={Package} label="Service">
                {order.service?.name_en || order.service?.name || '—'}
              </Fact>
              <Fact icon={Layers} label="Package">
                {serviceTypeName ?? <span className="dt-muted">Not recorded</span>}
                {serviceTypeArabic && <em className="od-fact-alt" dir="rtl">{serviceTypeArabic}</em>}
              </Fact>
              <Fact icon={Calendar} label="Scheduled">
                {order.scheduled_at ? formatDateTime(order.scheduled_at) : 'ASAP'}
              </Fact>
              <Fact icon={Clock} label="Booking">
                {order.schedule_type || 'On-Demand'}
              </Fact>
              <Fact icon={MapPin} label="Location">
                {order.address_text || 'No location recorded'}
              </Fact>
            </div>

            {order.addons?.length > 0 && (
              <div className="od-addons">
                <span className="od-fact-label">Add-ons</span>
                {order.addons.map((addon, i) => (
                  <div key={i} className="od-addon">
                    <span>{addon.name_en || addon.name || `Add-on ${i + 1}`}</span>
                    {addon.price != null && (
                      <em><span className="riyal-symbol">&#x20C1;</span>{money(addon.price)}</em>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="od-card">
            <h3 className="od-card-title">Customer</h3>
            <div className="od-party">
              <span className="od-avatar">{initials(customerName)}</span>
              <div>
                <strong>{customerName}</strong>
                {order.customer?.status && (
                  <span className={`dt-status dt-status--${order.customer.status === 'Active' ? 'success' : 'neutral'}`}>
                    {order.customer.status}
                  </span>
                )}
              </div>
            </div>
            {(order.customer_id || order.customer?.id) && (
              <button
                className="od-link"
                onClick={() => navigate(`/admin/customers/${order.customer_id || order.customer?.id}`)}
              >
                Open customer <ChevronRight size={14} />
              </button>
            )}
            {order.customer?.profile?.national_address && (
              <Fact icon={MapPin} label="National address">
                {order.customer.profile.national_address}
              </Fact>
            )}
            {order.ratings?.length > 0 && (
              <div className="od-rating">
                <span className="od-stars">
                  {'★'.repeat(order.ratings[0]?.rating || 0)}
                  <em>{'★'.repeat(Math.max(0, 5 - (order.ratings[0]?.rating || 0)))}</em>
                </span>
                {order.ratings[0]?.comment && <p>{order.ratings[0].comment}</p>}
              </div>
            )}
          </section>

          <section className="od-card">
            <h3 className="od-card-title">Provider</h3>
            {order.provider ? (
              <>
                <div className="od-party">
                  <span className="od-avatar">{initials(order.provider._name)}</span>
                  <div>
                    <strong>{order.provider._name || '—'}</strong>
                    {order.provider.status && (
                      <span className="dt-status dt-status--neutral">{order.provider.status}</span>
                    )}
                  </div>
                </div>
                {order.provider._phone && (
                  <Fact icon={Phone} label="Phone">{order.provider._phone}</Fact>
                )}
                <button
                  className="od-link"
                  onClick={() => navigate(`/admin/service-providers/${order.provider.id}`)}
                >
                  Open provider <ChevronRight size={14} />
                </button>
              </>
            ) : (
              <p className="od-empty">No provider assigned yet.</p>
            )}
          </section>
        </aside>

        {/* ── Deep dives ───────────────────────────────────────────────── */}
        <div className="od-main">
          <div className="od-tabs" role="tablist">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`od-tab ${activeTab === tab ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {TAB_LABELS[tab] ?? tab}
              </button>
            ))}
          </div>

          <div className="od-panel">
            {/* FINANCIALS */}
            {activeTab === 'financials' && (() => {
              const payments = Array.isArray(order.payments) ? order.payments : []
              const tip = Number(order.tip_amount || 0)

              return (
                <div className="od-financials">
                  <dl className="od-pay-meta">
                    <div>
                      <dt>Timing</dt>
                      <dd>{PAYMENT_TIMING_LABELS[order.payment_timing] ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Paid at</dt>
                      <dd>{order.paid_at ? formatDateTime(order.paid_at) : '—'}</dd>
                    </div>
                    <div>
                      <dt>Payment required</dt>
                      <dd>{order.is_payment_required === false ? 'No' : 'Yes'}</dd>
                    </div>
                  </dl>

                  <div className="od-breakdown">
                    <div className="od-line">
                      <span>Standard service base fee</span>
                      <strong><span className="riyal-symbol">&#x20C1;</span>{money(order.base_price)}</strong>
                    </div>
                    <div className="od-line">
                      <span>Add-ons &amp; equipment</span>
                      <strong><span className="riyal-symbol">&#x20C1;</span>{money(order.addons_total)}</strong>
                    </div>
                    {tip > 0 && (
                      <div className="od-line">
                        <span>Tip</span>
                        <strong><span className="riyal-symbol">&#x20C1;</span>{money(tip)}</strong>
                      </div>
                    )}
                    <div className="od-line is-total">
                      <span>Total payable</span>
                      <strong><span className="riyal-symbol">&#x20C1;</span>{money(order.total_price)}</strong>
                    </div>
                  </div>

                  {(commission > 0 || providerNet > 0) && (
                    <div className="od-breakdown">
                      <div className="od-line">
                        <span>
                          Platform commission
                          {!isSettled && <em className="od-line-note"> · estimated</em>}
                        </span>
                        <strong><span className="riyal-symbol">&#x20C1;</span>{money(commission)}</strong>
                      </div>
                      <div className="od-line">
                        <span>
                          Provider net payout
                          {!isSettled && <em className="od-line-note"> · estimated</em>}
                        </span>
                        <strong><span className="riyal-symbol">&#x20C1;</span>{money(providerNet)}</strong>
                      </div>
                      <div className="od-line">
                        <span>Wallet settled</span>
                        <strong className="od-line-muted">
                          {order.wallet_processed_at ? formatDateTime(order.wallet_processed_at) : 'Pending'}
                        </strong>
                      </div>
                    </div>
                  )}

                  <h4 className="od-card-title">Payment attempts</h4>
                  {payments.length === 0 ? (
                    <p className="od-empty">No payment records for this order yet.</p>
                  ) : (
                    <TableScroll>
                      <table className="dt-table" style={{ minWidth: 620 }}>
                        <thead>
                          <tr>
                            <th>Reference</th>
                            <th>Method</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => {
                            const tone = PAYMENT_RECORD_TONES[String(p.status).toUpperCase()] ?? 'muted'
                            return (
                              <tr key={p.id}>
                                <td><code>{p.payment_no ?? '—'}</code></td>
                                <td>{p.payment_method?.name ?? p.provider_code ?? '—'}</td>
                                <td>
                                  <strong><span className="riyal-symbol">&#x20C1;</span>{money(p.amount)}</strong>
                                </td>
                                <td>
                                  <span className={`dt-dot-label dt-tone--${tone}`}>
                                    <span className="dt-dot" />{p.status}
                                  </span>
                                </td>
                                <td className="dt-muted">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </TableScroll>
                  )}
                </div>
              )
            })()}

            {/* MEDIA */}
            {activeTab === 'media' && (
              <div className="od-media">
                {['BEFORE', 'AFTER'].map((type) => {
                  const photos = (order.media || []).filter((m) => m.type === type)
                  if (photos.length === 0) return null
                  return (
                    <div key={type} className="od-media-group">
                      <h4 className="od-card-title">{type.charAt(0) + type.slice(1).toLowerCase()} photos</h4>
                      <div className="od-media-grid">
                        {photos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            className="od-photo"
                            onClick={() => setLightbox(photo.file_url)}
                          >
                            <img src={photo.file_url} alt={type} loading="lazy" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {(!order.media || order.media.length === 0) && (
                  <p className="od-empty">No media uploaded for this order.</p>
                )}
              </div>
            )}

            {/* TIMELINE */}
            {activeTab === 'timeline' && (
              order.timeline?.length > 0 ? (
                <ol className="od-timeline">
                  {order.timeline.map((event, idx) => (
                    <li key={idx} className={`od-event ${idx === 0 ? 'is-latest' : ''}`}>
                      <span className="od-event-dot" />
                      <div>
                        <strong>{event.status?.replace(/_/g, ' ')}</strong>
                        <em>{formatDateTime(event.created_at)}</em>
                        {event.note && <p>{event.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="od-empty">No history recorded.</p>
              )
            )}

            {/* LIVE TRACKING */}
            {activeTab === 'tracking' && hasProvider && (
              <div className="od-tracking">
                <div className="tracking-legend">
                  <span className="tracking-key">
                    <i className="tracking-dot tracking-dot--provider" />
                    {order.provider?._name ?? 'Service provider'}
                    {posUpdatedAt && (
                      <em className="tracking-stamp">updated {formatDateTime(posUpdatedAt)}</em>
                    )}
                  </span>
                  <span className="tracking-key">
                    <img src={ORDER_PIN_SRC} alt="" className="tracking-pin" />
                    Job location
                    {order.address_text && (
                      <em className="tracking-stamp">{order.address_text}</em>
                    )}
                  </span>
                </div>

                {!providerPos && !destinationPos ? (
                  <p className="od-empty">
                    No coordinates recorded for this order or provider yet.
                  </p>
                ) : (
                  <>
                    <div className="tracking-map">
                      <LiveTrackingMap
                        apiKey={mapsApiKey}
                        provider={providerPos}
                        destination={destinationPos}
                      />
                    </div>
                    {!providerPos && (
                      <p className="tracking-note">
                        The provider has not reported a position yet — only the job
                        location is shown. Positions arrive once the provider app
                        starts sending them.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* CHAT */}
            {activeTab === 'chat' && hasProvider && (
              <div className="order-chat-tab">
                <ChatThread orderId={orderId} />
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <div className="od-lightbox" onClick={() => setLightbox(null)} role="presentation">
          <button type="button" className="od-lightbox-close" aria-label="Close photo">
            <X size={20} />
          </button>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Modals */}
      {confirmCancel.open && (
        <div className="modal-overlay" onClick={() => setConfirmCancel({ open: false })}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon warning">
              <AlertTriangle size={32} />
            </div>
            <h3 className="modal-title">Cancel this order?</h3>
            <p className="modal-text">This action cannot be undone. The order will be marked as cancelled.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmCancel({ open: false })}>Keep order</button>
              <button className="btn-danger" onClick={handleConfirmCancelOrder}>Yes, cancel order</button>
            </div>
          </div>
        </div>
      )}

      {reassignState.open && (
        <div className="modal-overlay" onClick={() => setReassignState({ ...reassignState, open: false })}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon info">
              <UserCog size={32} />
            </div>
            <h3 className="modal-title">Reassign to Provider</h3>
            {reassignState.selectedName && (
              <p className="modal-selected">Selected: {reassignState.selectedName}</p>
            )}
            <form onSubmit={handleReassignSubmit} className="modal-form">
              <div className="search-box">
                <Filter size={16} />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={reassignState.spSearch}
                  onChange={(e) => setReassignState(prev => ({ ...prev, spSearch: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="provider-list">
                {reassignState.spLoading ? (
                  <div className="provider-loading">
                    <Loader2 size={18} className="spin" /> Loading providers...
                  </div>
                ) : (() => {
                  const q = reassignState.spSearch.toLowerCase()
                  const filtered = reassignState.spList.filter(sp => {
                    const name = sp.full_name || sp.name || ''
                    const phone = sp.phone || ''
                    return name.toLowerCase().includes(q) || phone.includes(q)
                  })
                  if (filtered.length === 0) return <div className="provider-empty">No providers found</div>
                  return filtered.map(sp => {
                    const id = sp.id || sp._id
                    const name = sp.full_name || sp.name || `SP-${id?.slice(0, 8)}`
                    const isSelected = reassignState.providerId === id
                    return (
                      <div
                        key={id}
                        className={`provider-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setReassignState(prev => ({ ...prev, providerId: id, selectedName: name, error: '' }))}
                      >
                        <div className="provider-info">
                          <span className="provider-name">{name}</span>
                          {sp.phone && <span className="provider-phone">{sp.phone}</span>}
                        </div>
                        {isSelected && <CheckCircle size={20} className="selected-icon" />}
                      </div>
                    )
                  })
                })()}
              </div>

              {reassignState.error && <p className="modal-error">{reassignState.error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setReassignState({ ...reassignState, open: false })}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={reassignState.submitting || !reassignState.providerId}>
                  {reassignState.submitting ? <><Loader2 size={16} className="spin" /> Reassigning…</> : 'Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {messageModal.open && (
        <div className="modal-overlay" onClick={closeMessageModal}>
          <div className={`modal-dialog modal-${messageModal.type}`} onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icon ${messageModal.type}`}>
              {messageModal.type === 'success' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h3 className="modal-title">{messageModal.title}</h3>
            <p className="modal-text">{messageModal.message}</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={closeMessageModal}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetail
