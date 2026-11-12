import { useState, useEffect, useMemo } from 'react'
import API_BASE_URL from '../../config'
import StatusBadge from '../../components/StatusBadge'
import { IconShield, IconRefresh } from '../../components/Icons'

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

export default function LedgerView({ accounts }) {
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [filterType, setFilterType] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(String(accounts[0].id))
    }
  }, [accounts, selectedAccountId])

  useEffect(() => {
    if (!selectedAccountId) return

    let isMounted = true
    async function fetchLedger() {
      setLoading(true)
      setError('')
      try {
        const token = sessionStorage.getItem('ledgerline_access_token')
        const response = await fetch(
          `${API_BASE_URL}/api/transactions/accounts/${selectedAccountId}/ledger`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json'
            }
          }
        )

        if (!response.ok) {
          const errData = await response.json().catch(() => null)
          throw new Error(errData?.message || 'Failed to load ledger entries.')
        }

        const data = await response.json()
        if (isMounted) {
          setLedgerEntries(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchLedger()

    return () => {
      isMounted = false
    }
  }, [selectedAccountId])

  const selectedAccount = accounts.find((a) => String(a.id) === String(selectedAccountId))

  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      if (filterType === 'ALL') return true
      return entry.entryType === filterType
    })
  }, [ledgerEntries, filterType])

  const { creditCount, debitCount, creditSum, debitSum } = useMemo(() => {
    let creditCount = 0
    let debitCount = 0
    let creditSum = 0
    let debitSum = 0

    ledgerEntries.forEach((e) => {
      const amt = Number(e.amount || 0)
      if (e.entryType === 'CREDIT') {
        creditCount++
        creditSum += amt
      } else if (e.entryType === 'DEBIT') {
        debitCount++
        debitSum += amt
      }
    })

    return { creditCount, debitCount, creditSum, debitSum }
  }, [ledgerEntries])

  return (
    <div className="page-content-wrapper">
      <div className="page-title-bar">
        <div>
          <h2 className="page-main-heading">Account Statement & Ledger</h2>
          <p className="page-main-subtext">
            Complete chronological statement with running balances and verified audit protection.
          </p>
        </div>

        <div className="ledger-immutability-pill">
          <IconShield className="w-4 h-4 text-emerald" />
          <span>Verified Audit Trail</span>
        </div>
      </div>

      {/* Account Selector Strip */}
      <div className="account-selector-strip">
        <label htmlFor="ledger-acc-picker">Selected Account:</label>
        <select
          id="ledger-acc-picker"
          className="ledger-select"
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          disabled={loading || accounts.length === 0}
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.accountNumber} — Balance: ₹ {formatBalance(acc.balance)} ({acc.status})
            </option>
          ))}
        </select>
      </div>

      {/* Ledger Metrics Cards */}
      <div className="ledger-metrics-grid">
        <div className="ledger-metric-card">
          <span className="ledger-metric-label">TOTAL ENTRIES</span>
          <span className="ledger-metric-num font-mono">{ledgerEntries.length}</span>
          <span className="ledger-metric-hint">Historical entries</span>
        </div>

        <div className="ledger-metric-card">
          <span className="ledger-metric-label">TOTAL CREDITS</span>
          <span className="ledger-metric-num text-emerald font-mono">
            + ₹ {formatBalance(creditSum)}
          </span>
          <span className="ledger-metric-hint">{creditCount} incoming credits</span>
        </div>

        <div className="ledger-metric-card">
          <span className="ledger-metric-label">TOTAL DEBITS</span>
          <span className="ledger-metric-num text-danger font-mono">
            - ₹ {formatBalance(debitSum)}
          </span>
          <span className="ledger-metric-hint">{debitCount} outgoing debits</span>
        </div>

        <div className="ledger-metric-card primary">
          <span className="ledger-metric-label">RUNNING BALANCE</span>
          <span className="ledger-metric-num font-mono">
            ₹ {formatBalance(selectedAccount?.balance || 0)}
          </span>
          <span className="ledger-metric-hint">Current verified balance</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="table-controls-card">
        <div className="filter-group">
          <span className="filter-label">Entry Type:</span>
          {['ALL', 'CREDIT', 'DEBIT'].map((type) => (
            <button
              key={type}
              type="button"
              className={`filter-pill-btn ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {type === 'ALL' ? 'All Entries' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="loading-placeholder">
          <IconRefresh className="w-5 h-5 animate-spin mr-2 inline" />
          Loading verified ledger entries...
        </div>
      ) : error ? (
        <div className="form-alert error">
          <span>✕</span>
          <span>{error}</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="empty-state-card">
          <p className="muted">No ledger entries recorded for this account yet.</p>
        </div>
      ) : (
        <div className="table-responsive-container">
          <table className="banking-table font-mono">
            <thead>
              <tr>
                <th>ENTRY ID</th>
                <th>TRANSACTION ID</th>
                <th>ENTRY TYPE</th>
                <th>AMOUNT</th>
                <th>BALANCE AFTER</th>
                <th>RECORDED TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className="text-muted">#{entry.id}</span>
                  </td>
                  <td>
                    <span className="font-bold text-primary">#{entry.transactionId}</span>
                  </td>
                  <td>
                    <StatusBadge status={entry.entryType} />
                  </td>
                  <td className="font-semibold">
                    <span className={entry.entryType === 'CREDIT' ? 'text-emerald' : 'text-danger'}>
                      {entry.entryType === 'CREDIT' ? '+ ' : '- '}₹ {formatBalance(entry.amount)}
                    </span>
                  </td>
                  <td className="font-bold">
                    ₹ {formatBalance(entry.balanceAfter)}
                  </td>
                  <td className="text-muted text-xs">
                    {formatDate(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="ledger-security-banner">
        <IconShield className="w-5 h-5 text-emerald" />
        <div>
          <strong>Certified Balance Statement</strong>
          <p>
            This statement reflects permanent, audited financial records.
            All debits and credits are mathematically balanced and verified in real time.
          </p>
        </div>
      </div>
    </div>
  )
}

