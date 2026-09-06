/**
 * A `dt-table` header cell that sorts on click.
 *
 * The arrows are a single small glyph rather than two icons, so the pair stays
 * optically balanced at 9px and the header keeps its normal height. Both halves
 * are grey until the column is sorted, then the active half takes the text
 * colour — the direction is legible without reading the label.
 */
function SortableTh({ sortKey, sort, children, className = '', style }) {
  const isActive = sort.sortKey === sortKey
  const dir = isActive ? sort.sortDir : null

  return (
    <th
      className={`dt-th-sort ${isActive ? 'is-sorted' : ''} ${className}`.trim()}
      style={style}
      aria-sort={isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" onClick={() => sort.toggle(sortKey)}>
        <span>{children}</span>
        <svg className="dt-sort-glyph" width="8" height="12" viewBox="0 0 8 12" aria-hidden="true">
          <path className={dir === 'asc' ? 'is-on' : ''} d="M4 0.5 L7.2 4.3 H0.8 Z" />
          <path className={dir === 'desc' ? 'is-on' : ''} d="M4 11.5 L0.8 7.7 H7.2 Z" />
        </svg>
      </button>
    </th>
  )
}

export default SortableTh
