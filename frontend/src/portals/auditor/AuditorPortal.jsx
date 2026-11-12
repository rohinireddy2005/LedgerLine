import { useState, useEffect, useCallback } from 'react'
import API_BASE_URL from '../../config'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import {
  IconAccounts,
  IconTransactions,
  IconShield,
  IconRefresh
} from '../../components/Icons'

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

export default function AuditorPortal({ activeTab, onNavigateTab }) {
  // Accounts
  const [accounts, setAccounts] = useState([])
  const [accountsPage, setAccountsPage] = useState(0)
  const [accountsTotalPages, setAccountsTotalPages] = useState(0)
  const [accountsTotalElements, setAccountsTotalElements] = useState(0)

  // Transactions
  const [transactions, setTransactions] = useState([])
  const [txPage, setTxPage] = useState(0)
  const [txTotalPages, setTxTotalPages] = useState(0)
  const [txTotalElements, setTxTotalElements] = useState(0)
  const [selectedTx, setSelectedTx] = useState(null)

  // Ledger Inspector
  const [targetAccountId, setTargetAccountId] = useState('')
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [ledgerPage, setLedgerPage] = useState(0)
  const [ledgerTotalPages, setLedgerTotalPages] = useState(0)
  const [ledgerTotalElements, setLedgerTotalElements] = useState(0)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerError, setLedgerError] = useState('')

  const [loading, setLoading] = useState(false)
  const token = sessionStorage.getItem('ledgerline_access_token')

  const fetchAccounts = useCallback(async (page = 0) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/auditor/accounts?page=${page}&size=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })
      if (!res.ok) throw new Error('Failed to load accounts')
      const data = await res.json()
      setAccounts(data.content || [])
      setAccountsPage(data.number || 0)
      setAccountsTotalPages(data.totalPages || 0)
      setAccountsTotalElements(data.totalElements || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchTransactions = useCallback(async (page = 0) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/auditor/transactions?page=${page}&size=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })
      if (!res.ok) throw new Error('Failed to load transactions')
      const data = await res.json()
      setTransactions(data.content || [])
      setTxPage(data.number || 0)
      setTxTotalPages(data.totalPages || 0)
      setTxTotalElements(data.totalElements || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchLedger = useCallback(async (accountId, page = 0) => {
    const id = accountId || targetAccountId
    if (!id) return

    setLedgerLoading(true)
    setLedgerError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/auditor/ledger/${id}?page=${page}&size=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })
      if (!res.ok) {
        if (res.status === 404) throw new Error(`Account ID #${id} not found.`)
        throw new Error('Failed to load ledger records.')
      }
      const data = await res.json()
      setLedgerEntries(data.content || [])
      setLedgerPage(data.number || 0)
      setLedgerTotalPages(data.totalPages || 0)
      setLedgerTotalElements(data.totalElements || 0)
    } catch (err) {
      setLedgerError(err.message)
    } finally {
      setLedgerLoading(false)
    }
  }, [token, targetAccountId])

  useEffect(() => {
    fetchAccounts(0)
    fetchTransactions(0)
  }, [fetchAccounts, fetchTransactions])

  return (
    <div className="page-content-wrapper auditor-portal">
      {/* AUDITOR OVERVIEW */}
      {activeTab === 'auditor-overview' && (
        <div className="auditor-overview-view">
          <div className="page-title-bar">
            <div>
              <h2 className="page-main-heading">Independent Audit Oversight</h2>
              <p className="page-main-subtext">
                Read-only inspection portal for external verification of financial movements, balances, and ledger entries.
              </p>
            </div>
            <div className="read-only-badge">
              <IconShield className="w-4 h-4 text-emerald" />
              <span>STRICT READ-ONLY AUDIT ACCESS</span>
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card primary">
              <div className="metric-card-header">
                <span className="metric-label">TOTAL MONITORED ACCOUNTS</span>
                <span className="metric-icon-badge">
                  <IconAccounts className="w-4 h-4" />
                </span>
              </div>
              <div className="metric-value font-mono">{accountsTotalElements}</div>
              <div className="metric-footer">
                <span className="metric-sub">Across all registered account holders</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-label">TOTAL AUDITED TRANSACTIONS</span>
                <span className="metric-icon-badge">
                  <IconTransactions className="w-4 h-4" />
                </span>
              </div>
              <div className="metric-value font-mono">{txTotalElements}</div>
              <div className="metric-footer">
                <span className="metric-sub">Deposits, withdrawals, and transfers</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-label">AUDIT INTEGRITY</span>
                <span className="metric-icon-badge success">✓</span>
              </div>
              <div className="metric-value text-emerald">Verified</div>
              <div className="metric-footer">
                <span className="metric-sub">Certified tamper-evident ledger</span>
              </div>
            </div>
          </div>

          <div className="auditor-compliance-card mt-6">
            <div className="compliance-icon-wrap">
              <IconShield className="w-8 h-8 text-primary" />
            </div>
            <div className="compliance-body">
              <h4>Regulatory Compliance & Audit Oversight</h4>
              <p>
                LedgerLine implements strict separation of duties. As an Auditor, you possess read-only visibility into all accounts, transactions, and ledger records without ability to execute financial mutations or alter balances.
              </p>
              <div className="compliance-badges">
                <span className="audit-chip">Double-Entry Certified</span>
                <span className="audit-chip">Duplicate Protection Active</span>
                <span className="audit-chip">Real-Time Reconciled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALL ACCOUNTS TAB */}
      {activeTab === 'auditor-accounts' && (
        <div className="auditor-accounts-view">
          <div className="page-title-bar">
            <div>
              <h2 className="page-main-heading">Global Account Register</h2>
              <p className="page-main-subtext">
                Comprehensive audit view of all customer accounts in the institution.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchAccounts(accountsPage)}
              disabled={loading}
            >
              <IconRefresh className="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>

          <div className="table-responsive-container">
            <table className="banking-table">
              <thead>
                <tr>
                  <th>ACCOUNT NUMBER</th>
                  <th>ACCOUNT ID</th>
                  <th>OWNER NAME</th>
                  <th>AVAILABLE BALANCE</th>
                  <th>STATUS</th>
                  <th>CREATED AT</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <span className="font-mono font-bold text-primary">{acc.accountNumber}</span>
                    </td>
                    <td className="font-mono text-muted">#{acc.id}</td>
                    <td className="font-medium">{acc.ownerName}</td>
                    <td className="font-mono font-bold">₹ {formatBalance(acc.balance)}</td>
                    <td>
                      <StatusBadge status={acc.status} />
                    </td>
                    <td className="text-muted text-xs">{formatDate(acc.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => {
                          setTargetAccountId(String(acc.id))
                          onNavigateTab('auditor-ledger')
                          fetchLedger(acc.id, 0)
                        }}
                      >
                        Inspect Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {accountsTotalPages > 1 && (
            <div className="table-pagination-bar">
              <span className="pagination-info">
                Page {accountsPage + 1} of {accountsTotalPages} ({accountsTotalElements} accounts)
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchAccounts(accountsPage - 1)}
                  disabled={accountsPage === 0 || loading}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchAccounts(accountsPage + 1)}
                  disabled={accountsPage >= accountsTotalPages - 1 || loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SYSTEM TRANSACTIONS TAB */}
      {activeTab === 'auditor-transactions' && (
        <div className="auditor-transactions-view">
          <div className="page-title-bar">
            <div>
              <h2 className="page-main-heading">System-Wide Transaction Feed</h2>
              <p className="page-main-subtext">
                Live chronological feed of all deposits, withdrawals, and inter-account transfers.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchTransactions(txPage)}
              disabled={loading}
            >
              <IconRefresh className="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>

          <div className="table-responsive-container">
            <table className="banking-table">
              <thead>
                <tr>
                  <th>TXN ID</th>
                  <th>DATE & TIME</th>
                  <th>INITIATOR</th>
                  <th>TYPE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.transactionId}>
                    <td>
                      <span className="font-mono font-bold text-primary">#{tx.transactionId}</span>
                    </td>
                    <td className="text-muted text-xs">{formatDate(tx.createdAt)}</td>
                    <td>
                      <div className="initiator-cell">
                        <span className="font-medium text-sm">{tx.initiatorName}</span>
                        <span className="text-xs text-muted block">{tx.initiatorEmail}</span>
                      </div>
                    </td>
                    <td>
                      <span className="tx-type-pill">{tx.type}</span>
                    </td>
                    <td className="font-mono font-bold">₹ {formatBalance(tx.amount)}</td>
                    <td>
                      <StatusBadge status={tx.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => setSelectedTx(tx)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {txTotalPages > 1 && (
            <div className="table-pagination-bar">
              <span className="pagination-info">
                Page {txPage + 1} of {txTotalPages} ({txTotalElements} transactions)
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchTransactions(txPage - 1)}
                  disabled={txPage === 0 || loading}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchTransactions(txPage + 1)}
                  disabled={txPage >= txTotalPages - 1 || loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEDGER INSPECTOR TAB */}
      {activeTab === 'auditor-ledger' && (
        <div className="auditor-ledger-view">
          <div className="page-title-bar">
            <div>
              <h2 className="page-main-heading">Account Ledger Inspector</h2>
              <p className="page-main-subtext">
                Audit every debit and credit entry for a specific account with chronological balance tracking.
              </p>
            </div>
          </div>

          <div className="reconciliation-control-card">
            <div className="form-group flex-1">
              <label htmlFor="auditor-acc-input">Account ID to Audit</label>
              <input
                id="auditor-acc-input"
                type="number"
                placeholder="Enter Account ID (e.g. 1)"
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary self-end"
              onClick={() => fetchLedger()}
              disabled={!targetAccountId || ledgerLoading}
            >
              {ledgerLoading ? 'Loading Ledger...' : 'Audit Ledger'}
            </button>
          </div>

          {ledgerError && (
            <div className="form-alert error my-4">
              <span>✕</span>
              <span>{ledgerError}</span>
            </div>
          )}

          {ledgerEntries.length > 0 && (
            <div className="mt-4">
              <div className="table-responsive-container">
                <table className="banking-table font-mono">
                  <thead>
                    <tr>
                      <th>ENTRY ID</th>
                      <th>TRANSACTION ID</th>
                      <th>ENTRY TYPE</th>
                      <th>AMOUNT</th>
                      <th>BALANCE AFTER</th>
                      <th>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((e) => (
                      <tr key={e.id}>
                        <td className="text-muted">#{e.id}</td>
                        <td className="font-bold text-primary">#{e.transactionId}</td>
                        <td>
                          <StatusBadge status={e.entryType} />
                        </td>
                        <td className="font-semibold">
                          <span className={e.entryType === 'CREDIT' ? 'text-emerald' : 'text-danger'}>
                            {e.entryType === 'CREDIT' ? '+ ' : '- '}₹ {formatBalance(e.amount)}
                          </span>
                        </td>
                        <td className="font-bold">₹ {formatBalance(e.balanceAfter)}</td>
                        <td className="text-muted text-xs">{formatDate(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {ledgerTotalPages > 1 && (
                <div className="table-pagination-bar">
                  <span className="pagination-info">
                    Page {ledgerPage + 1} of {ledgerTotalPages} ({ledgerTotalElements} entries)
                  </span>
                  <div className="pagination-buttons">
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => fetchLedger(targetAccountId, ledgerPage - 1)}
                      disabled={ledgerPage === 0 || ledgerLoading}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => fetchLedger(targetAccountId, ledgerPage + 1)}
                      disabled={ledgerPage >= ledgerTotalPages - 1 || ledgerLoading}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audit Transaction Modal */}
      {selectedTx && (
        <Modal
          title={`Audit Transaction Record #${selectedTx.transactionId}`}
          subtitle="Complete unmasked auditor record"
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
              <span className="amount-label">AMOUNT</span>
              <h3 className="amount-display font-mono">₹ {formatBalance(selectedTx.amount)} INR</h3>
            </div>

            {selectedTx.rejectionReason && (
              <div className="rejection-reason-box">
                <span className="rejection-title">RECORDED REJECTION REASON:</span>
                <p className="rejection-text">{selectedTx.rejectionReason}</p>
              </div>
            )}

            <div className="detail-rows-list">
              <div className="detail-row">
                <span className="detail-key">Initiator User</span>
                <span className="detail-val">
                  {selectedTx.initiatorName} ({selectedTx.initiatorEmail})
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Transaction Type</span>
                <span className="detail-val font-medium">{selectedTx.type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Source Account ID</span>
                <span className="detail-val font-mono">
                  {selectedTx.sourceAccountId ? `#${selectedTx.sourceAccountId}` : 'External / Cash Deposit'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Destination Account ID</span>
                <span className="detail-val font-mono">
                  {selectedTx.destinationAccountId ? `#${selectedTx.destinationAccountId}` : 'External / Withdrawal'}
                </span>
              </div>
            </div>

            <div className="modal-actions-single mt-4">
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={() => setSelectedTx(null)}
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
