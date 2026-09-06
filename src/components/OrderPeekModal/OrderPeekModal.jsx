import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Loader2, AlertTriangle, Package, Layers, Calendar, Clock, MapPin,
  User, Wrench, ExternalLink,
} from 'lucide-react'
import { getAdminOrderDetails } from '../../api'
import { normalizeStatus, orderStatusTone } from '../../pages/admin/orders/orderStatus'
import { getPaymentState, formatMoney } from '../../pages/admin/orders/paymentStatus'
import './OrderPeekModal.css'

function partyName(party) {
  return party?.profile?.full_name
    ?? party?.profile?.company_name
    ?? party?.full_name
    ?? party?.name
    ?? null
}

function Row({ icon: Icon, label, children }) {
  return (
    <div className="opk-row">
      <span className="opk-label">{label}</span>
      <span className="opk-value">
        {Icon && <Icon size={15} />}
        <span>{children}</span>
      </span>
    </div>
  )
}

/**
 * A read-only look at one order, for when leaving the page would cost more than
 * the answer is worth — reading a conversation and wanting to know what the
 * order actually is.
 *
 * Deliberately not the order detail page in a box: no tabs, no actions, no
 * chat-inside-chat. Anything beyond a glance goes to the real page through the
 * footer link, which is also why nothing here can change the order.
 */
function OrderPeekModal({ orderId, onClose }) {
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setOrder(await getAdminOrderDetails(orderId))
    } catch (err) {
      setOrder(null)
      setError(err.message || 'Failed to load this order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const status = order ? normalizeStatus(order.status) : null
  const pay = order ? getPaymentState(order) : null
  const money = order ? formatMoney(order.total_price, order.currency) : null

  return (
    <div className="opk-backdrop" onClick={onClose} role="presentation">
      <div
        className="opk-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="opk-head">
          <div>
            <h2>
              {loading
                ? 'Loading order…'
                : `Order ${order?.order_no ?? orderId.slice(0, 8)}`}
            </h2>
            {order && (
              <p>
                Created {new Date(order.created_at).toLocaleDateString(undefined, {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
          <button className="opk-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="opk-body">
          {loading ? (
            <div className="opk-state"><Loader2 size={26} className="spin" /><span>Loading…</span></div>
          ) : error ? (
            <div className="opk-state">
              <AlertTriangle size={26} />
              <span>{error}</span>
            </div>
          ) : order && (
            <>
              <div className="opk-badges">
                <span className={`dt-status dt-status--${orderStatusTone(status)}`}>
                  {status.replace(/_/g, ' ')}
                </span>
                <span className={`dt-dot-label dt-tone--${pay.tone}`}>
                  <span className="dt-dot" />
                  {pay.label}
                </span>
                <strong className="opk-total">
                  <span className="riyal-symbol">&#x20C1;</span>{money.amount}
                </strong>
              </div>

              <Row icon={Package} label="Service">
                {order.service?.name_en || order.service?.name || '—'}
              </Row>
              <Row icon={Layers} label="Package">
                {order.serviceType?.name_en || order.category?.name_en || 'Standard'}
              </Row>
              <Row icon={Calendar} label="Scheduled">
                {order.scheduled_at ? new Date(order.scheduled_at).toLocaleString() : 'ASAP'}
              </Row>
              <Row icon={Clock} label="Booking">
                {order.schedule_type || 'On-Demand'}
              </Row>
              <Row icon={MapPin} label="Location">
                {order.address_text || 'No location recorded'}
              </Row>
              <Row icon={User} label="Customer">
                {partyName(order.customer) ?? '—'}
              </Row>
              <Row icon={Wrench} label="Provider">
                {partyName(order.provider) ?? 'Unassigned'}
              </Row>
            </>
          )}
        </div>

        <footer className="opk-foot">
          <button className="dt-btn" onClick={onClose}>Close</button>
          <button
            className="dt-btn dt-btn--primary"
            onClick={() => navigate(`/admin/orders/${orderId}`)}
          >
            Open full order <ExternalLink size={14} />
          </button>
        </footer>
      </div>
    </div>
  )
}

export default OrderPeekModal
