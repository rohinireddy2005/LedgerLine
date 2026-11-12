
import { useEffect, useMemo, useState } from 'react'
import API_BASE_URL from './config'

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(dateValue) {
  if (!dateValue) return '—'

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Ledger() {
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('All')
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [isLoadingLedger, setIsLoadingLedger] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadAccounts() {
      const token = sessionStorage.getItem('ledgerline_access_token')

      if (!token) {
        setError('Your session has expired. Please sign in again.')
        setIsLoadingAccounts(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.message || data?.detail || 'Could not load accounts.'
          )
        }

        if (!Array.isArray(data)) {
          throw new Error('Unexpected account response from banking service.')
        }

        setAccounts(data)

        if (data.length > 0) {
          setSelectedAccountId(String(data[0].id))
        }
      } catch (err) {
        console.error('Ledger account loading error:', err)
        setError(err.message || 'Unable to load accounts.')
      } finally {
        setIsLoadingAccounts(false)
      }
    }

    loadAccounts()
  }, [])

  useEffect(() => {
    if (!selectedAccountId) {
      return
    }

    const controller = new AbortController()

    async function loadLedger() {
      const token = sessionStorage.getItem('ledgerline_access_token')

      if (!token) {
        setError('Your session has expired. Please sign in again.')
        return
      }

      setIsLoadingLedger(true)
      setError('')
      setEntries([])

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/transactions/accounts/${selectedAccountId}/ledger`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          }
        )

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.message || data?.detail || 'Could not load ledger entries.'
          )
        }

        if (!Array.isArray(data)) {
          throw new Error('Unexpected statement response from banking service.')
        }

        setEntries(data)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Ledger loading error:', err)
          setError(err.message || 'Unable to load ledger entries.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingLedger(false)
        }
      }
    }

    loadLedger()

    return () => controller.abort()
  }, [selectedAccountId])

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      return filter === 'All' || entry.entryType === filter
    })
  }, [entries, filter])

  const creditCount = entries.filter(
    (entry) => entry.entryType === 'CREDIT'
  ).length

  const debitCount = entries.filter(
    (entry) => entry.entryType === 'DEBIT'
  ).length

  return (
    <section className="section-block page-card">
      <div className="section-heading">
        <div>
          <h2>Transaction Ledger</h2>
          <p>Review the debit and credit records for money movements.</p>
        </div>

        <span className="status">LIVE LEDGER DATA</span>
      </div>

      <div className="account-form">
        <label htmlFor="ledger-account">
          <strong>Select Account</strong>
        </label>

        <select
          id="ledger-account"
          value={selectedAccountId}
          onChange={(event) => {
            setSelectedAccountId(event.target.value)
            setFilter('All')
          }}
          disabled={isLoadingAccounts || accounts.length === 0}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.accountNumber} — Account ID: {account.id}
            </option>
          ))}
        </select>
      </div>

      <div className="ledger-summary">
        <div className="ledger-summary-card">
          <span>Total Entries</span>
          <h2>{entries.length}</h2>
        </div>

        <div className="ledger-summary-card">
          <span>Credit Entries</span>
          <h2 className="credit">{creditCount}</h2>
        </div>

        <div className="ledger-summary-card">
          <span>Debit Entries</span>
          <h2 className="debit">{debitCount}</h2>
        </div>
      </div>

      <div className="section-heading ledger-heading">
        <div>
          <h3>Ledger Entries</h3>
          <p>Each record represents one side of a money movement.</p>
        </div>

        <div className="transaction-filters">
          {['All', 'CREDIT', 'DEBIT'].map((type) => (
            <button
              key={type}
              className={`filter-button ${filter === type ? 'selected' : ''}`}
              onClick={() => setFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {isLoadingAccounts && (
        <p className="muted">Loading your accounts...</p>
      )}

      {isLoadingLedger && (
        <p className="muted">Loading real ledger entries...</p>
      )}

      {error && (
        <p className="money-message" role="alert">
          {error}
        </p>
      )}

      {!isLoadingAccounts && accounts.length === 0 && !error && (
        <p className="muted">
          No accounts found. Create an account to get started.
        </p>
      )}

      {!isLoadingLedger &&
        !error &&
        selectedAccountId &&
        filteredEntries.length === 0 && (
          <p className="muted">
            No {filter === 'All' ? '' : filter.toLowerCase() + ' '}
            ledger entries found for this account.
          </p>
        )}

      {!isLoadingLedger && filteredEntries.length > 0 && (
        <div className="table-wrapper">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>ENTRY ID</th>
                <th>TRANSACTION ID</th>
                <th>ACCOUNT ID</th>
                <th>TYPE</th>
                <th>AMOUNT</th>
                <th>BALANCE AFTER</th>
                <th>DATE</th>
              </tr>
            </thead>

            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.id}</td>
                  <td>{entry.transactionId}</td>
                  <td>{entry.accountId}</td>
                  <td>
                    <span
                      className={
                        entry.entryType === 'CREDIT' ? 'credit' : 'debit'
                      }
                    >
                      {entry.entryType}
                    </span>
                  </td>
                  <td>₹ {formatAmount(entry.amount)}</td>
                  <td>₹ {formatAmount(entry.balanceAfter)}</td>
                  <td>{formatDate(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="ledger-note">
        <strong>Certified Statement:</strong>
        <p>
          These records reflect verified entries from the central banking system.
          Each entry records the transaction, account, debit or credit amount,
          and resulting account balance.
        </p>
      </div>
    </section>
  )
}

export default Ledger
