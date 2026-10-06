import {
  Loader2, AlertTriangle, ScrollText, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react'
import SortableTh from '../../../components/DataTable/SortableTh'
import { useTableSort } from '../../../components/DataTable/useTableSort'
import TableScroll from '../../../components/DataTable/TableScroll'
import { formatMoney, formatDate } from './walletFormat.js'
import {
  typeLabel,
  counterparty,
  referenceLabel,
  isCredit,
  transactionStatusTone,
} from './ledger.js'

/**
 * Shared immutable ledger table used by the hub (platform tab) and
 * provider/customer detail pages.
 */
export default function LedgerTable({
  items,
  loading,
  error,
  emptyTitle = 'No transactions',
  emptyHint = 'The ledger is empty.',
  hideAccount = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  moreLabel,
}) {
  const sort = useTableSort()

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

  if (error) {
    return (
      <div className="tl-alert">
        <AlertTriangle size={16} />
        <span>{error}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dt-empty">
        <Loader2 size={32} className="spin" />
        <span>Loading ledger…</span>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="dt-empty">
        <ScrollText size={32} />
        <h2>{emptyTitle}</h2>
        <p>{emptyHint}</p>
      </div>
    )
  }

  return (
    <>
      <div className="dt-card">
        <TableScroll>
          <table className="dt-table">
            <thead>
              <tr>
                <SortableTh sortKey="ref" sort={sort}>Transaction</SortableTh>
                <SortableTh sortKey="date" sort={sort}>Date</SortableTh>
                {!hideAccount && (
                  <SortableTh sortKey="account" sort={sort}>Account</SortableTh>
                )}
                <SortableTh sortKey="type" sort={sort}>Type</SortableTh>
                <SortableTh sortKey="amount" sort={sort} className="tl-num">Amount</SortableTh>
                <SortableTh sortKey="fee" sort={sort} className="tl-num">Fee</SortableTh>
                <SortableTh sortKey="net" sort={sort} className="tl-num">Net</SortableTh>
                <SortableTh sortKey="balance" sort={sort} className="tl-num">Balance after</SortableTh>
                <SortableTh sortKey="status" sort={sort}>Status</SortableTh>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((txn) => {
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
                    {!hideAccount && (
                      <td>
                        <span className="tl-party">
                          <strong>{party.name}</strong>
                          {party.role && <em>{party.role}</em>}
                        </span>
                      </td>
                    )}
                    <td>
                      <span className="tl-type">
                        <strong>{typeLabel(txn.type)}</strong>
                        {txn.description && <em>{txn.description}</em>}
                      </span>
                    </td>
                    <td className="tl-num">
                      <span className={`tl-amount ${credit ? 'is-credit' : 'is-debit'}`}>
                        {credit
                          ? <ArrowDownLeft size={13} aria-label="Credit" />
                          : <ArrowUpRight size={13} aria-label="Debit" />}
                        {credit ? '+' : '−'}
                        <span className="riyal-symbol">&#x20C1;</span>
                        {formatMoney(Math.abs(txn.amount))}
                      </span>
                    </td>
                    <td className="tl-num dt-muted">
                      {fee !== 0
                        ? <><span className="riyal-symbol">&#x20C1;</span>{formatMoney(Math.abs(fee))}</>
                        : '—'}
                    </td>
                    <td className="tl-num tl-net">
                      <span className="riyal-symbol">&#x20C1;</span>
                      {formatMoney(Math.abs(txn.net_amount))}
                    </td>
                    <td className="tl-num dt-muted">
                      <span className="riyal-symbol">&#x20C1;</span>
                      {formatMoney(txn.available_after)}
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

      {hasMore && onLoadMore && (
        <div className="tl-more">
          <button
            type="button"
            className="dt-btn"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore
              ? <><Loader2 size={16} className="spin" /> Loading…</>
              : (moreLabel || 'Load more')}
          </button>
        </div>
      )}
    </>
  )
}
