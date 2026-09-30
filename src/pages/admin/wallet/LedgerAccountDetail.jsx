import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader/PageHeader'
import {
  getWalletLedger,
  getProviderDetails,
  getCustomerDetails,
} from '../../../api'
import { formatMoney, unwrapList } from './walletFormat.js'
import { LEDGER_TYPES, typeLabel } from './ledger.js'
import LedgerTable from './LedgerTable'
import './TransactionLedger.css'

const PAGE_SIZE = 20

function LedgerAccountDetail({ kind }) {
  const { providerId, customerId } = useParams()
  const id = kind === 'provider' ? providerId : customerId
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  const [type, setType] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalVolume, setTotalVolume] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setProfileLoading(true)
    setProfileError('')
    const fetchProfile = kind === 'provider'
      ? getProviderDetails(id)
      : getCustomerDetails(id)

    fetchProfile
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((e) => {
        if (!cancelled) setProfileError(e.message || 'Failed to load account')
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })

    return () => { cancelled = true }
  }, [kind, id])

  const load = useCallback(async (nextPage, replace) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError('')
    try {
      const data = await getWalletLedger({
        type: type || undefined,
        providerId: kind === 'provider' ? id : undefined,
        customerId: kind === 'customer' ? id : undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      const { items: rows, total: count } = unwrapList(data)
      setItems((prev) => (replace ? rows : [...prev, ...rows]))
      setTotal(count)
      setTotalVolume(data?.total_volume ?? null)
      setPage(nextPage)
    } catch (err) {
      setError(err.message || 'Failed to load ledger')
      if (replace) setItems([])
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [kind, id, type])

  useEffect(() => { load(1, true) }, [load])

  const name = kind === 'provider'
    ? (profile?.full_name || profile?.user?.full_name || profile?.name || 'Service provider')
    : (profile?.name || profile?.full_name || profile?.user?.full_name || 'Customer')

  const email = profile?.email || profile?.user?.email || ''
  const walletBalance = kind === 'provider'
    ? (profile?.wallet_balance ?? profile?.wallet?.available_balance)
    : (profile?.walletBalance ?? profile?.wallet_balance ?? profile?.wallet?.available_balance)

  const backTab = kind === 'provider' ? '' : '?tab=customers'
  const backPath = `/admin/wallet/transaction-ledger${backTab}`

  return (
    <div className="transaction-ledger">
      <PageHeader
        title={profileLoading ? 'Loading…' : name}
        subtitle={
          kind === 'provider'
            ? 'Service provider wallet ledger'
            : 'Customer wallet ledger'
        }
        onBack={() => navigate(backPath)}
      />

      {profileError && (
        <div className="tl-alert">
          <AlertTriangle size={16} />
          <span>{profileError}</span>
        </div>
      )}

      <div className="tl-stats">
        <div className="tl-stat">
          <span className="tl-stat-label">Available balance</span>
          <span className="tl-stat-value">
            {profileLoading
              ? <Loader2 size={18} className="spin" />
              : <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(walletBalance)}</>}
          </span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-label">Transactions</span>
          <span className="tl-stat-value">{loading ? '—' : total.toLocaleString()}</span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-label">Net volume</span>
          <span className="tl-stat-value">
            {loading || totalVolume == null
              ? '—'
              : <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(totalVolume)}</>}
          </span>
        </div>
        {email && (
          <div className="tl-stat">
            <span className="tl-stat-label">Contact</span>
            <span className="tl-stat-value" style={{ fontSize: '1rem' }}>{email}</span>
          </div>
        )}
      </div>

      <div className="dt-toolbar">
        <div className="dt-toolbar-actions">
          <div className="dt-field">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Transaction type"
            >
              <option value="">All types</option>
              {LEDGER_TYPES.map((t) => (
                <option key={t} value={t}>{typeLabel(t)}</option>
              ))}
            </select>
          </div>
          {!loading && (
            <span className="tl-count">
              Showing {items.length.toLocaleString()} of {total.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <LedgerTable
        items={items}
        loading={loading}
        error={error}
        hideAccount
        emptyTitle="No transactions"
        emptyHint="No wallet movements for this account yet."
        hasMore={items.length < total}
        loadingMore={loadingMore}
        onLoadMore={() => load(page + 1, false)}
        moreLabel={`Load more (${items.length} of ${total})`}
      />
    </div>
  )
}

export function ProviderLedgerDetail() {
  return <LedgerAccountDetail kind="provider" />
}

export function CustomerLedgerDetail() {
  return <LedgerAccountDetail kind="customer" />
}

export default LedgerAccountDetail
