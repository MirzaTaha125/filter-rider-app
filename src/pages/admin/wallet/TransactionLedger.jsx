import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2, AlertTriangle, ScrollText, ArrowDownLeft, ArrowUpRight, Search, X,
} from 'lucide-react'
import { getWalletLedger, getCustomers, getProviders } from '../../../api'
import { formatMoney, formatDate, unwrapList } from './walletFormat.js'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import {
  LEDGER_TYPES,
  typeLabel,
  counterparty,
  referenceLabel,
  isCredit,
  transactionStatusTone,
} from './ledger.js'
import './TransactionLedger.css'
import TableScroll from '../../../components/DataTable/TableScroll'

const PAGE_SIZE = 20
const SUGGEST_LIMIT = 6

function toCustomerPeople(data) {
  const list = Array.isArray(data) ? data : data?.customers ?? data?.items ?? []
  return list.map((row) => ({
    id: row.id,
    name: row.name || row.full_name || row.email || 'Customer',
    role: 'Customer',
    kind: 'customer',
  }))
}

function toProviderPeople(data) {
  const list = Array.isArray(data) ? data : data?.items ?? []
  return list.map((row) => ({
    id: row.id,
    name: row.full_name || row.name || row.email || 'Provider',
    role: 'Provider',
    kind: 'provider',
  }))
}

function NameSearchCombo({ value, onChange, onApply, onClear, applied }) {
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  useEffect(() => {
    const term = value.trim()
    if (term.length < 2) {
      setSuggestions([])
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      Promise.all([
        getCustomers({ search: term, page: 1, limit: SUGGEST_LIMIT }).catch(() => []),
        getProviders({ search: term, page: 1, limit: SUGGEST_LIMIT }).catch(() => []),
      ]).then(([customers, providers]) => {
        if (cancelled) return
        setSuggestions([
          ...toCustomerPeople(customers),
          ...toProviderPeople(providers),
        ].slice(0, 10))
        setHighlight(-1)
      }).finally(() => {
        if (!cancelled) setLoading(false)
      })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value])

  useEffect(() => {
    const onDocClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const pick = (person) => {
    onApply({
      customerId: person.kind === 'customer' ? person.id : '',
      providerId: person.kind === 'provider' ? person.id : '',
      search: '',
      label: person.name,
    })
    setOpen(false)
  }

  const submitText = () => {
    onApply({
      search: value.trim(),
      customerId: '',
      providerId: '',
      label: value.trim(),
    })
    setOpen(false)
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setHighlight((i) => Math.min(i + 1, suggestions.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((i) => Math.max(i - 1, -1))
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (open && highlight >= 0 && suggestions[highlight]) {
        pick(suggestions[highlight])
        return
      }
      submitText()
    }
  }

  const showClear = Boolean(value || applied.search || applied.customerId || applied.providerId)

  return (
    <div className="tl-combo" ref={wrapRef}>
      <div className={`dt-search ${open ? 'is-open' : ''}`}>
        <Search size={16} />
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="tl-combo-list"
          placeholder="Search customer or service provider…"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {showClear && (
          <button
            type="button"
            className="tl-combo-clear"
            aria-label="Clear search"
            onClick={() => {
              onClear()
              setSuggestions([])
              setOpen(false)
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && value.trim().length >= 2 && (
        <ul id="tl-combo-list" className="tl-combo-list" role="listbox">
          {loading && suggestions.length === 0 && (
            <li className="tl-combo-empty">Searching names…</li>
          )}
          {suggestions.map((person, index) => (
            <li key={`${person.kind}-${person.id}`}>
              <button
                type="button"
                role="option"
                aria-selected={highlight === index}
                className={highlight === index ? 'is-active' : ''}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(person)}
              >
                <strong>{person.name}</strong>
                <em>{person.role}</em>
              </button>
            </li>
          ))}
          {!loading && suggestions.length === 0 && (
            <li className="tl-combo-empty">No matching names. Press Enter to search anyway.</li>
          )}
        </ul>
      )}
    </div>
  )
}

function TransactionLedger() {
  const [type, setType] = useState('')
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState({ search: '', customerId: '', providerId: '' })
  const [items, setItems] = useState([])
  const sort = useTableSort()
  const [total, setTotal] = useState(0)
  const [totalVolume, setTotalVolume] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (nextPage, replace) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError('')
    try {
      const data = await getWalletLedger({
        type: type || undefined,
        search: applied.search || undefined,
        customerId: applied.customerId || undefined,
        providerId: applied.providerId || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      const { items: rows, total: count } = unwrapList(data)
      setItems(prev => (replace ? rows : [...prev, ...rows]))
      setTotal(count)
      setTotalVolume(data?.total_volume ?? null)
      setPage(nextPage)
    } catch (err) {
      setError(err.message || 'Failed to load ledger')
      if (replace) setItems([])
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [type, applied.search, applied.customerId, applied.providerId])

  useEffect(() => { load(1, true) }, [load])

  const applySearch = (next) => {
    setQuery(next.label ?? '')
    setApplied({
      search: next.search || '',
      customerId: next.customerId || '',
      providerId: next.providerId || '',
    })
  }

  const clearSearch = () => {
    setQuery('')
    setApplied({ search: '', customerId: '', providerId: '' })
  }

  const hasMore = items.length < total
  const searching = Boolean(applied.search || applied.customerId || applied.providerId)

  const sortedItems = sort.apply(items, {
    ref: (t) => t.transaction_no,
    date: (t) => new Date(t.created_at ?? 0).getTime(),
    account: (t) => counterparty(t).name,
    type: (t) => typeLabel(t.type),
    amount: (t) => Number(t.amount ?? 0),
    fee: (t) => Number(t.fee_amount ?? 0),
    net: (t) => Number(t.net_amount ?? 0),
    balance: (t) => Number(t.available_after ?? 0),
    status: (t) => t.status,
  })

  return (
    <div className="transaction-ledger">
      <header className="dt-page-head">
        <div>
          <p className="dt-page-sub">Immutable audit trail of every wallet movement.</p>
        </div>
      </header>

      <div className="tl-stats">
        <div className="tl-stat">
          <span className="tl-stat-label">
            {type ? `${typeLabel(type)} transactions` : 'Total transactions'}
          </span>
          <span className="tl-stat-value">{loading ? '—' : total.toLocaleString()}</span>
        </div>
        <div className="tl-stat">
          <span className="tl-stat-label">Net volume</span>
          <span className="tl-stat-value">
            {loading || totalVolume === null
              ? '—'
              : <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(totalVolume)}</>}
          </span>
        </div>
      </div>

      <div className="dt-toolbar">
        <NameSearchCombo
          value={query}
          applied={applied}
          onChange={setQuery}
          onApply={applySearch}
          onClear={clearSearch}
        />
        <div className="dt-toolbar-actions">
          <div className="dt-field">
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Transaction type">
              <option value="">All types</option>
              {LEDGER_TYPES.map(t => (
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

      {error && (
        <div className="tl-alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="dt-empty">
          <Loader2 size={32} className="spin" />
          <span>Loading ledger…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="dt-empty">
          <ScrollText size={32} />
          <h2>No transactions</h2>
          <p>
            {searching
              ? 'No wallet movements match that customer or provider.'
              : type
                ? `No ${typeLabel(type).toLowerCase()} transactions recorded.`
                : 'The ledger is empty.'}
          </p>
        </div>
      ) : (
        <>
          <div className="dt-card">
            <TableScroll>
              <table className="dt-table">
                <thead>
                  <tr>
                    <SortableTh sortKey="ref" sort={sort}>Transaction</SortableTh>
                    <SortableTh sortKey="date" sort={sort}>Date</SortableTh>
                    <SortableTh sortKey="account" sort={sort}>Account</SortableTh>
                    <SortableTh sortKey="type" sort={sort}>Type</SortableTh>
                    <SortableTh sortKey="amount" sort={sort} className="tl-num">Amount</SortableTh>
                    <SortableTh sortKey="fee" sort={sort} className="tl-num">Fee</SortableTh>
                    <SortableTh sortKey="net" sort={sort} className="tl-num">Net</SortableTh>
                    <SortableTh sortKey="balance" sort={sort} className="tl-num">Balance after</SortableTh>
                    <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map(txn => {
                    const party = counterparty(txn)
                    const reference = referenceLabel(txn)
                    const credit = isCredit(txn)
                    const fee = Number(txn.fee_amount ?? 0)
                    return (
                      <tr key={txn.id}>
                        <td>
                          <span className="tl-ref">
                            <strong>{txn.transaction_no ?? '—'}</strong>
                            {reference && (
                              <em>{reference.kind} {reference.label}</em>
                            )}
                          </span>
                        </td>
                        <td className="dt-muted">{formatDate(txn.created_at, true)}</td>
                        <td>
                          <span className="tl-party">
                            <strong>{party.name}</strong>
                            {party.role && <em>{party.role}</em>}
                          </span>
                        </td>
                        <td>
                          <span className="tl-type">{typeLabel(txn.type)}</span>
                        </td>
                        <td className="tl-num">
                          <span className={`tl-amount ${credit ? 'is-credit' : 'is-debit'}`}>
                            {credit
                              ? <ArrowDownLeft size={13} aria-label="Credit" />
                              : <ArrowUpRight size={13} aria-label="Debit" />}
                            {credit ? '+' : '−'}
                            <span className="riyal-symbol">&#x20C1;</span>{formatMoney(Math.abs(txn.amount))}
                          </span>
                        </td>
                        <td className="tl-num dt-muted">
                          {fee !== 0
                            ? <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(Math.abs(fee))}</>
                            : '—'}
                        </td>
                        <td className="tl-num tl-net">
                          <span className="riyal-symbol">&#x20C1;</span>{formatMoney(Math.abs(txn.net_amount))}
                        </td>
                        <td className="tl-num dt-muted">
                          <span className="riyal-symbol">&#x20C1;</span>{formatMoney(txn.available_after)}
                        </td>
                        <td>
                          <span className={`dt-status dt-status--${transactionStatusTone(txn.status)}`}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableScroll>
          </div>

          {hasMore && (
            <div className="tl-more">
              <button
                className="dt-btn"
                onClick={() => load(page + 1, false)}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <><Loader2 size={16} className="spin" /> Loading…</>
                  : `Load more (${items.length} of ${total})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TransactionLedger
