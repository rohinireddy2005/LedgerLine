import { useState, useMemo } from 'react'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import { IconSearch } from '../../components/Icons'

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
  const [selectedTx, setSelectedTx] = useState(null)

  const userAccountIds = useMemo(() => new Set(accounts.map((a) => a.id)), [accounts])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type Filter
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false

      // Status Filter
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false

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
  }, [transactions, typeFilter, statusFilter, searchQuery])

  return (
    <div className="page-content-wrapper">
      <div className="page-title-bar">
        <div>
          <h2 className="page-main-heading">Transaction Activity</h2>
          <p className="page-main-subtext">
            Comprehensive audit record of all financial movements and requests processed by LedgerLine.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-controls-card">
        <div className="filter-group">
          <span className="filter-label">Type:</span>
          {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER'].map((t) => (
            <button
              key={t}
              type="button"
              className={`filter-pill-btn ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
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
              onClick={() => setStatusFilter(s)}
            >
              {s === 'ALL' ? 'All Status' : s}
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <IconSearch className="search-icon w-4 h-4" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by ID, Account, Reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="loading-placeholder">Loading transactions...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="empty-state-card">
          <p className="muted">No transactions match your selected filter criteria.</p>
        </div>
      ) : (
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
              {filteredTransactions.map((tx) => {
                const isCredit =
                  tx.type === 'DEPOSIT' ||
                  (tx.type === 'TRANSFER' && userAccountIds.has(tx.destinationAccountId) && !userAccountIds.has(tx.sourceAccountId))
                const isDebit =
                  tx.type === 'WITHDRAWAL' ||
                  (tx.type === 'TRANSFER' && userAccountIds.has(tx.sourceAccountId) && !userAccountIds.has(tx.destinationAccountId))

                return (
                  <tr key={tx.id} onClick={() => setSelectedTx(tx)} className="clickable-row">
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
                      {tx.type === 'TRANSFER' && `Acc #${tx.sourceAccountId} → Acc #${tx.destinationAccountId}`}
                    </td>
                    <td className="font-mono font-semibold">
                      <span className={isCredit ? 'text-emerald' : isDebit ? 'text-danger' : ''}>
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
              <h3 className="amount-display font-mono">₹ {formatBalance(selectedTx.amount)} INR</h3>
            </div>

            {selectedTx.status === 'REJECTED' && (
              <div className="rejection-reason-box">
                <span className="rejection-title">REJECTION REASON:</span>
                <p className="rejection-text">
                  {selectedTx.rejectionReason || 'Transaction policy rejection.'}
                </p>
              </div>
            )}

            <div className="detail-rows-list">
              <div className="detail-row">
                <span className="detail-key">Transaction Type</span>
                <span className="detail-val font-medium">{selectedTx.type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Source Account</span>
                <span className="detail-val font-mono">
                  {selectedTx.sourceAccountId ? `Account ID #${selectedTx.sourceAccountId}` : 'External / System Deposit'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Destination Account</span>
                <span className="detail-val font-mono">
                  {selectedTx.destinationAccountId ? `Account ID #${selectedTx.destinationAccountId}` : 'External / Cash Withdrawal'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Reference ID</span>
                <span className="detail-val font-mono text-xs truncate" title={selectedTx.idempotencyKey}>
                  {selectedTx.idempotencyKey}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Authorization</span>
                <span className="detail-val font-mono">Verified Account Holder</span>
              </div>
            </div>

            <div className="modal-actions-single mt-4">
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

