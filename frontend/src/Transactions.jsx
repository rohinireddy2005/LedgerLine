
import { useEffect, useMemo, useState } from 'react'
import API_BASE_URL from './config'

function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadTransactions() {
      try {
        setLoading(true)
        setError('')

        const token = sessionStorage.getItem('ledgerline_access_token')

        if (!token) {
          throw new Error('Please log in to view your transactions.')
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        }

        const accountsResponse = await fetch(
          `${API_BASE_URL}/api/accounts`,
          { headers, signal: controller.signal }
        )

        const accountsData = await accountsResponse.json()

        if (!accountsResponse.ok) {
          throw new Error(
            accountsData.message || 'Unable to load your accounts.'
          )
        }

        const accounts = Array.isArray(accountsData) ? accountsData : []

        const ledgerResults = await Promise.all(
          accounts.map(async (account) => {
            const response = await fetch(
              `${API_BASE_URL}/api/transactions/accounts/${account.id}/ledger`,
              { headers, signal: controller.signal }
            )

            const data = await response.json()

            if (!response.ok) {
              throw new Error(
                data.message ||
                `Unable to load ledger for account ${account.id}.`
              )
            }

            return Array.isArray(data) ? data : []
          })
        )

        // Combine all account ledgers.
        const allEntries = ledgerResults.flat()

        // Group entries belonging to the same transaction.
        const grouped = new Map()

        allEntries.forEach((entry) => {
          const transactionId = String(entry.transactionId)

          if (!grouped.has(transactionId)) {
            grouped.set(transactionId, [])
          }

          grouped.get(transactionId).push(entry)
        })

        const actualTransactions = Array.from(grouped.entries()).map(
          ([transactionId, entries]) => {
            const firstEntry = entries[0]

            const hasCredit = entries.some(
              (entry) => entry.entryType === 'CREDIT'
            )

            const hasDebit = entries.some(
              (entry) => entry.entryType === 'DEBIT'
            )

            let type = 'Debit'

            if (hasCredit && hasDebit) {
              type = 'Transfer'
            } else if (hasCredit) {
              type = 'Credit'
            }

            const accountIds = [
              ...new Set(entries.map((entry) => entry.accountId))
            ]

            return {
              id: transactionId,
              name: `Transaction #${transactionId}`,
              date: new Date(firstEntry.createdAt).toLocaleString('en-IN'),
              type,
              amount: Number(firstEntry.amount),
              accountIds,
              status: 'Posted',
              timestamp: new Date(firstEntry.createdAt).getTime(),
            }
          }
        )

        actualTransactions.sort((a, b) => b.timestamp - a.timestamp)
        setTransactions(actualTransactions)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load transactions.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadTransactions()

    return () => controller.abort()
  }, [])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesType =
        filter === 'All' ||
        (filter === 'Credit' && transaction.type === 'Credit') ||
        (filter === 'Debit' && transaction.type === 'Debit')

      const matchesSearch =
        transaction.name.toLowerCase().includes(search.toLowerCase()) ||
        transaction.id.toLowerCase().includes(search.toLowerCase()) ||
        transaction.accountIds.some((accountId) =>
          String(accountId).includes(search)
        )

      return matchesType && matchesSearch
    })
  }, [transactions, filter, search])

  const formatAmount = (amount, type) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount)

    if (type === 'Credit') return `+ ${formatted}`
    if (type === 'Debit') return `- ${formatted}`

    return formatted
  }

  return (
    <section className="section-block page-card">
      <div className="section-heading">
        <div>
          <h2>All Transactions</h2>
          <p>Search and review your actual account activity.</p>
        </div>

        <span className="live-label">LIVE DATA</span>
      </div>

      <div className="transaction-controls">
        <input
          type="text"
          placeholder="Search by transaction ID or account ID..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="transaction-filters">
          {['All', 'Credit', 'Debit'].map((type) => (
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

      {loading ? (
        <div className="account-placeholder">
          <p>Loading your transactions...</p>
        </div>
      ) : error ? (
        <div className="account-placeholder">
          <h3>Unable to load transactions</h3>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <p className="muted">
            Showing {filteredTransactions.length} transaction(s)
          </p>

          {filteredTransactions.length > 0 ? (
            <div className="table-wrapper">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>TRANSACTION</th>
                    <th>DATE</th>
                    <th>TYPE</th>
                    <th>AMOUNT</th>
                    <th>ACCOUNT(S)</th>
                    <th>STATUS</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <strong>{transaction.name}</strong>
                        <span className="transaction-id">
                          TXN{transaction.id}
                        </span>
                      </td>

                      <td>{transaction.date}</td>
                      <td>{transaction.type}</td>

                      <td
                        className={
                          transaction.type === 'Credit'
                            ? 'credit'
                            : transaction.type === 'Debit'
                              ? 'debit'
                              : ''
                        }
                      >
                        {formatAmount(transaction.amount, transaction.type)}
                      </td>

                      <td>{transaction.accountIds.join(', ')}</td>

                      <td>
                        <span className="status">{transaction.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="account-placeholder">
              <h3>No transactions found</h3>
              <p>Try changing your search or filter.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default Transactions
