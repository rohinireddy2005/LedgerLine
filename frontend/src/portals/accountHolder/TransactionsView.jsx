import { useState, useMemo } from 'react'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import { IconSearch, IconDownload, IconRefresh } from '../../components/Icons'

function formatBalance(num) {
  return Number(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function TransactionsView({ transactions, accounts, isLoading }) {
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [selectedTx, setSelectedTx] = useState(null)

  const userAccountIds = useMemo(() => new Set(accounts.map((a) => a.id)), [accounts])

  // Filter and sort transactions
  const processedTransactions = useMemo(() => {
    let result = transactions.filter((tx) => {
      // Type Filter
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false

      // Status Filter
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false

      // Date Range Filter
      if (fromDate) {
        const txDate = new Date(tx.createdAt)
        const fDate = new Date(fromDate)
        fDate.setHours(0, 0, 0, 0)
        if (txDate < fDate) return false
      }
      if (toDate) {
        const txDate = new Date(tx.createdAt)
        const tDate = new Date(toDate)
        tDate.setHours(23, 59, 59, 999)
        if (txDate > tDate) return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = String(tx.id).includes(q)
        const matchType = String(tx.type).toLowerCase().includes(q)
        const matchSource = String(tx.sourceAccountId || '').includes(q)
        const matchDest = String(tx.destinationAccountId || '').includes(q)
        const matchKey = String(tx.idempotencyKey || '').toLowerCase().includes(q)
        if (!matchId && !matchType && !matchSource && !matchDest && !matchKey) {
          return false
        }
      }

      return true
    })

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      } else if (sortBy === 'date-asc') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      } else if (sortBy === 'amount-desc') {
        return Number(b.amount || 0) - Number(a.amount || 0)
      } else if (sortBy === 'amount-asc') {
        return Number(a.amount || 0) - Number(b.amount || 0)
      }
      return 0
    })

    return result
  }, [transactions, typeFilter, statusFilter, fromDate, toDate, searchQuery, sortBy])

  // Reset pagination when filter criteria changes
  const totalPages = Math.max(1, Math.ceil(processedTransactions.length / pageSize))
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return processedTransactions.slice(startIndex, startIndex + pageSize)
  }, [processedTransactions, currentPage, pageSize])

  const handleResetFilters = () => {
    setTypeFilter('ALL')
    setStatusFilter('ALL')
    setSearchQuery('')
    setFromDate('')
    setToDate('')
    setSortBy('date-desc')
    setCurrentPage(1)
  }

  // Export Filtered Records to CSV
  const handleExportCSV = () => {
    if (processedTransactions.length === 0) return

    const headers = [
      'Transaction ID',
      'Date & Time',
      'Type',
      'Source Account',
      'Destination Account',
      'Amount (INR)',
      'Status',
      'Reference Number',
      'Rejection Reason'
    ]

    const rows = processedTransactions.map((tx) => [
      `"${tx.id}"`,
      `"${formatDate(tx.createdAt)}"`,
      `"${tx.type}"`,
      `"${tx.sourceAccountId || ''}"`,
      `"${tx.destinationAccountId || ''}"`,
      `"${tx.amount}"`,
      `"${tx.status}"`,
      `"${tx.idempotencyKey || ''}"`,
      `"${(tx.rejectionReason || '').replace(/"/g, '""')}"`
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `ledgerline_transactions_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="page-content-wrapper">
      <div className="page-title-bar">
        <div>
          <h2 className="page-main-heading">Transaction Activity</h2>
          <p className="page-main-subtext">
            Comprehensive audit record of all financial movements and requests processed by LedgerLine.
          </p>
        </div>
        <div className="page-actions-group">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            disabled={processedTransactions.length === 0}
            title="Export filtered records to CSV"
          >
            <IconDownload className="w-4 h-4 inline-icon mr-1" />
            Export CSV ({processedTransactions.length})
          </button>
        </div>
      </div>

      {/* Advanced Filter and Search Controls */}
      <div className="table-controls-card">
        <div className="controls-row-top">
          <div className="filter-group">
            <span className="filter-label">Type:</span>
            {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER'].map((t) => (
              <button
                key={t}
                type="button"
                className={`filter-pill-btn ${typeFilter === t ? 'active' : ''}`}
                onClick={() => {
                  setTypeFilter(t)
                  setCurrentPage(1)
                }}
              >
                {t === 'ALL' ? 'All Types' : t}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <span className="filter-label">Status:</span>
            {['ALL', 'SUCCESS', 'REJECTED'].map((s) => (
              <button
                key={s}
                type="button"
                className={`filter-pill-btn ${statusFilter === s ? 'active' : ''}`}
                onClick={() => {
                  setStatusFilter(s)
                  setCurrentPage(1)
                }}
              >
                {s === 'ALL' ? 'All Status' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="controls-row-bottom">
          <div className="search-input-wrapper">
            <IconSearch className="search-icon w-4 h-4" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by ID, Account, Reference..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <div className="date-range-filter">
            <input
              type="date"
              className="date-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setCurrentPage(1)
              }}
              title="From Date"
            />
            <span className="date-sep">to</span>
            <input
              type="date"
              className="date-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setCurrentPage(1)
              }}
              title="To Date"
            />
          </div>

          <div className="sort-selector-wrapper">
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>

          {(typeFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            searchQuery ||
            fromDate ||
            toDate ||
            sortBy !== 'date-desc') && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <IconRefresh className="w-3.5 h-3.5 inline mr-1" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="loading-placeholder">Loading transactions...</div>
      ) : processedTransactions.length === 0 ? (
        <div className="empty-state-card">
          <p className="muted">No transactions match your selected filter criteria.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm mt-3"
            onClick={handleResetFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="table-responsive-container">
            <table className="banking-table">
              <thead>
                <tr>
                  <th>TRANSACTION ID</th>
                  <th>DATE & TIME</th>
                  <th>TYPE</th>
                  <th>ACCOUNTS</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx) => {
                  const isCredit =
                    tx.type === 'DEPOSIT' ||
                    (tx.type === 'TRANSFER' &&
                      userAccountIds.has(tx.destinationAccountId) &&
                      !userAccountIds.has(tx.sourceAccountId))
                  const isDebit =
                    tx.type === 'WITHDRAWAL' ||
                    (tx.type === 'TRANSFER' &&
                      userAccountIds.has(tx.sourceAccountId) &&
                      !userAccountIds.has(tx.destinationAccountId))

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="clickable-row"
                    >
                      <td>
                        <span className="font-mono font-bold text-primary">#{tx.id}</span>
                      </td>
                      <td className="text-muted">{formatDate(tx.createdAt)}</td>
                      <td>
                        <span className="tx-type-pill">{tx.type}</span>
                      </td>
                      <td className="text-xs font-mono">
                        {tx.type === 'DEPOSIT' && `→ Acc #${tx.destinationAccountId || '—'}`}
                        {tx.type === 'WITHDRAWAL' && `Acc #${tx.sourceAccountId} →`}
                        {tx.type === 'TRANSFER' &&
                          `Acc #${tx.sourceAccountId} → Acc #${tx.destinationAccountId}`}
                      </td>
                      <td className="font-mono font-semibold">
                        <span
                          className={
                            isCredit
                              ? 'text-emerald'
                              : isDebit
                                ? 'text-danger'
                                : ''
                          }
                        >
                          {isCredit ? '+ ' : isDebit ? '- ' : ''}₹ {formatBalance(tx.amount)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={tx.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTx(tx)
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">
                Showing{' '}
                <strong>
                  {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, processedTransactions.length)}
                </strong>{' '}
                of <strong>{processedTransactions.length}</strong> transactions
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  « First
                </button>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ‹ Prev
                </button>
                <span className="page-number-display">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next ›
                </button>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <Modal
          title={`Transaction Details #${selectedTx.id}`}
          subtitle="Complete metadata and ledger correlation record"
          isOpen={Boolean(selectedTx)}
          onClose={() => setSelectedTx(null)}
          maxWidth="520px"
        >
          <div className="tx-modal-details">
            <div className="tx-modal-status-strip">
              <StatusBadge status={selectedTx.status} />
              <span className="tx-modal-date">{formatDate(selectedTx.createdAt)}</span>
            </div>

            <div className="tx-modal-amount-box">
              <span className="amount-label">AMOUNT TRANSACTED</span>
              <span className="amount-value">₹ {formatBalance(selectedTx.amount)}</span>
              <span className="currency-label">INR • Indian Rupee</span>
            </div>

            <div className="tx-details-grid">
              <div className="detail-item">
                <span className="detail-label">TRANSACTION TYPE</span>
                <span className="detail-val font-semibold">{selectedTx.type}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">SETTLEMENT STATUS</span>
                <span className="detail-val font-semibold">{selectedTx.status}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">SOURCE ACCOUNT</span>
                <span className="detail-val font-mono">
                  {selectedTx.sourceAccountId ? `#${selectedTx.sourceAccountId}` : 'External Gateway / Deposit'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">DESTINATION ACCOUNT</span>
                <span className="detail-val font-mono">
                  {selectedTx.destinationAccountId ? `#${selectedTx.destinationAccountId}` : 'External Payout / Withdrawal'}
                </span>
              </div>
            </div>

            {selectedTx.rejectionReason && (
              <div className="rejection-reason-box">
                <span className="reason-title">REJECTION REASON</span>
                <p className="reason-text">{selectedTx.rejectionReason}</p>
              </div>
            )}

            <div className="idempotency-key-box">
              <span className="idempotency-label">TRANSACTION REFERENCE NUMBER</span>
              <code className="idempotency-key-code">{selectedTx.idempotencyKey || 'N/A'}</code>
              <span className="idempotency-explainer">
                Cryptographic transaction reference guaranteeing zero-duplicate execution.
              </span>
            </div>

            <div className="modal-actions-single">
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={() => setSelectedTx(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
