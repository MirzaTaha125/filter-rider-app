import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Loader2, AlertTriangle, Search, ChevronRight, Building2, Users, Landmark,
} from 'lucide-react'
import {
  getWalletLedger,
  getPlatformWallet,
  getCustomers,
  getProviders,
} from '../../../api'
import { formatMoney, unwrapList } from './walletFormat.js'
import { LEDGER_TYPES, typeLabel } from './ledger.js'
import LedgerTable from './LedgerTable'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import TableScroll from '../../../components/DataTable/TableScroll'
import './TransactionLedger.css'
import './PaymentApproval.css'

const PAGE_SIZE = 20
const TABS = [
  { id: 'providers', label: 'Service Providers', icon: Building2 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'platform', label: 'Platform', icon: Landmark },
]

function TransactionLedger() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam : 'providers'

  const setTab = (id) => {
    setSearchParams(id === 'providers' ? {} : { tab: id })
  }

  return (
    <div className="transaction-ledger">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">
            Browse wallet ledgers by service provider, customer, or platform (commission &amp; penalty residual).
          </p>
        </div>
      </header>

      <div className="pv-tabs" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`pv-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'providers' && <ProvidersTab />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'platform' && <PlatformTab />}
    </div>
  )
}

function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function ProvidersTab() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const applied = useDebounced(search.trim())
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const sort = useTableSort()

  const load = useCallback(async (nextPage, replace) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError('')
    try {
      const data = await getProviders({
        page: nextPage,
        limit: PAGE_SIZE,
        search: applied || undefined,
      })
      const rows = Array.isArray(data) ? data : (data?.items ?? [])
      const count = data?.meta?.total ?? data?.total ?? rows.length
      setItems((prev) => (replace ? rows : [...prev, ...rows]))
      setTotal(count)
      setPage(nextPage)
    } catch (err) {
      setError(err.message || 'Failed to load service providers')
      if (replace) setItems([])
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [applied])

  useEffect(() => { load(1, true) }, [load])

  const sorted = sort.apply(items, {
    name: (p) => p.full_name || p.name,
    balance: (p) => Number(p.wallet_balance ?? p.wallet?.available_balance ?? 0),
    earnings: (p) => Number(p.total_earnings ?? 0),
    status: (p) => p.provider_status || p.status,
  })

  return (
    <>
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search service provider…"
        countLabel={!loading ? `${total.toLocaleString()} providers` : ''}
      />
      {error && <Alert error={error} />}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text="No service providers found." />
      ) : (
        <>
          <div className="dt-card">
            <TableScroll>
              <table className="dt-table">
                <thead>
                  <tr>
                    <SortableTh sortKey="name" sort={sort}>Provider</SortableTh>
                    <SortableTh sortKey="balance" sort={sort} className="tl-num">Wallet balance</SortableTh>
                    <SortableTh sortKey="earnings" sort={sort} className="tl-num">Lifetime earnings</SortableTh>
                    <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr
                      key={p.id}
                      className="tl-row-link"
                      onClick={() => navigate(`/admin/wallet/transaction-ledger/providers/${p.id}`)}
                    >
                      <td>
                        <strong>{p.full_name || p.name || '—'}</strong>
                        <div className="dt-muted tl-sub">{p.email || p.phone || ''}</div>
                      </td>
                      <td className="tl-num">
                        <span className="riyal-symbol">&#x20C1;</span>
                        {formatMoney(p.wallet_balance ?? p.wallet?.available_balance)}
                      </td>
                      <td className="tl-num">
                        <span className="riyal-symbol">&#x20C1;</span>
                        {formatMoney(p.total_earnings)}
                      </td>
                      <td>{p.provider_status || p.status || '—'}</td>
                      <td className="tl-chevron"><ChevronRight size={16} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>
          <LoadMore
            hasMore={items.length < total}
            loading={loadingMore}
            onClick={() => load(page + 1, false)}
          />
        </>
      )}
    </>
  )
}

function CustomersTab() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const applied = useDebounced(search.trim())
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const sort = useTableSort()

  const load = useCallback(async (nextPage, replace) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError('')
    try {
      const data = await getCustomers({
        page: nextPage,
        limit: PAGE_SIZE,
        search: applied || undefined,
      })
      const rows = Array.isArray(data)
        ? data
        : (data?.customers ?? data?.items ?? [])
      const count = data?.total ?? data?.meta?.total ?? rows.length
      setItems((prev) => (replace ? rows : [...prev, ...rows]))
      setTotal(count)
      setPage(nextPage)
    } catch (err) {
      setError(err.message || 'Failed to load customers')
      if (replace) setItems([])
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [applied])

  useEffect(() => { load(1, true) }, [load])

  const sorted = sort.apply(items, {
    name: (c) => c.name || c.full_name,
    balance: (c) => Number(c.walletBalance ?? c.wallet_balance ?? 0),
    status: (c) => c.status,
  })

  return (
    <>
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search customer…"
        countLabel={!loading ? `${total.toLocaleString()} customers` : ''}
      />
      {error && <Alert error={error} />}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text="No customers found." />
      ) : (
        <>
          <div className="dt-card">
            <TableScroll>
              <table className="dt-table">
                <thead>
                  <tr>
                    <SortableTh sortKey="name" sort={sort}>Customer</SortableTh>
                    <SortableTh sortKey="balance" sort={sort} className="tl-num">Wallet balance</SortableTh>
                    <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c) => (
                    <tr
                      key={c.id}
                      className="tl-row-link"
                      onClick={() => navigate(`/admin/wallet/transaction-ledger/customers/${c.id}`)}
                    >
                      <td>
                        <strong>{c.name || c.full_name || '—'}</strong>
                        <div className="dt-muted tl-sub">{c.email || c.phone || ''}</div>
                      </td>
                      <td className="tl-num">
                        <span className="riyal-symbol">&#x20C1;</span>
                        {formatMoney(c.walletBalance ?? c.wallet_balance)}
                      </td>
                      <td>{c.status || '—'}</td>
                      <td className="tl-chevron"><ChevronRight size={16} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>
          <LoadMore
            hasMore={items.length < total}
            loading={loadingMore}
            onClick={() => load(page + 1, false)}
          />
        </>
      )}
    </>
  )
}

function PlatformTab() {
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState('')
  const [type, setType] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalVolume, setTotalVolume] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSummaryLoading(true)
    getPlatformWallet()
      .then((data) => setSummary(data))
      .catch((e) => setSummaryError(e.message || 'Failed to load platform wallet'))
      .finally(() => setSummaryLoading(false))
  }, [])

  const load = useCallback(async (nextPage, replace) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError('')
    try {
      const data = await getWalletLedger({
        ownerType: 'PLATFORM',
        type: type || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      const { items: rows, total: count } = unwrapList(data)
      setItems((prev) => (replace ? rows : [...prev, ...rows]))
      setTotal(count)
      setTotalVolume(data?.total_volume ?? null)
      setPage(nextPage)
    } catch (err) {
      setError(err.message || 'Failed to load platform ledger')
      if (replace) setItems([])
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [type])

  useEffect(() => { load(1, true) }, [load])

  const platformTypes = LEDGER_TYPES.filter((t) =>
    ['COMMISSION_DEDUCT', 'COMMISSION_RELEASE', 'PENALTY', 'REVERSAL', 'ADJUSTMENT'].includes(t),
  )

  return (
    <>
      <div className="tl-stats">
        <div className="tl-stat">
          <span className="tl-stat-label">Platform balance</span>
          <span className="tl-stat-value">
            {summaryLoading
              ? <Loader2 size={18} className="spin" />
              : <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(summary?.available_balance)}</>}
          </span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-label">Net commission</span>
          <span className="tl-stat-value">
            {summaryLoading
              ? '—'
              : <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(summary?.net_commission)}</>}
          </span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-label">Net penalty retained</span>
          <span className="tl-stat-value">
            {summaryLoading
              ? '—'
              : <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(summary?.net_penalty_retained)}</>}
          </span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-label">Ledger entries</span>
          <span className="tl-stat-value">
            {summaryLoading ? '—' : Number(summary?.transaction_count ?? 0).toLocaleString()}
          </span>
        </div>
      </div>

      {summaryError && <Alert error={summaryError} />}

      <div className="dt-toolbar">
        <div className="dt-toolbar-actions">
          <div className="dt-field">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Transaction type"
            >
              <option value="">All platform types</option>
              {platformTypes.map((t) => (
                <option key={t} value={t}>{typeLabel(t)}</option>
              ))}
            </select>
          </div>
          {!loading && (
            <span className="tl-count">
              Showing {items.length.toLocaleString()} of {total.toLocaleString()}
              {totalVolume != null && (
                <> · Net volume <span className="riyal-symbol">&#x20C1;</span>{formatMoney(totalVolume)}</>
              )}
            </span>
          )}
        </div>
      </div>

      <LedgerTable
        items={items}
        loading={loading}
        error={error}
        hideAccount
        emptyTitle="No platform transactions"
        emptyHint="Commission credits appear here after orders complete; penalty residuals after penalties are applied."
        hasMore={items.length < total}
        loadingMore={loadingMore}
        onLoadMore={() => load(page + 1, false)}
        moreLabel={`Load more (${items.length} of ${total})`}
      />
    </>
  )
}

function ListToolbar({ search, onSearchChange, placeholder, countLabel }) {
  return (
    <div className="dt-toolbar">
      <div className="dt-search">
        <Search size={16} />
        <input
          type="search"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {countLabel ? <span className="tl-count">{countLabel}</span> : null}
    </div>
  )
}

function Alert({ error }) {
  return (
    <div className="tl-alert">
      <AlertTriangle size={16} />
      <span>{error}</span>
    </div>
  )
}

function Loading() {
  return (
    <div className="dt-empty">
      <Loader2 size={32} className="spin" />
      <span>Loading…</span>
    </div>
  )
}

function Empty({ text }) {
  return (
    <div className="dt-empty">
      <span>{text}</span>
    </div>
  )
}

function LoadMore({ hasMore, loading, onClick }) {
  if (!hasMore) return null
  return (
    <div className="tl-more">
      <button type="button" className="dt-btn" onClick={onClick} disabled={loading}>
        {loading
          ? <><Loader2 size={16} className="spin" /> Loading…</>
          : 'Load more'}
      </button>
    </div>
  )
}

export default TransactionLedger
