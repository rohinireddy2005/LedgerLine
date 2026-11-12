import { useMemo, useState } from 'react'
import StatusBadge from '../../components/StatusBadge'
import {
  IconDeposit,
  IconWithdraw,
  IconTransfer,
  IconPlus,
  IconCopy,
  IconCheck,
  IconAccounts
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

export default function AccountHolderDashboard({
  user,
  accounts,
  transactions,
  isLoading,
  onOpenMoneyAction,
  onCreateAccount,
  onNavigateTab
}) {
  const [copiedId, setCopiedId] = useState('')

  function copyToClipboard(text, id) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(''), 2000)
    }
  }

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0)
  }, [accounts])

  const activeAccountsCount = useMemo(() => {
    return accounts.filter((acc) => acc.status === 'ACTIVE').length
  }, [accounts])

  const monthlyTotals = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let totalInflow = 0
    let totalOutflow = 0

    transactions.forEach((tx) => {
      if (tx.status !== 'SUCCESS') return
      const d = new Date(tx.createdAt)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const amt = Number(tx.amount || 0)
        if (tx.type === 'DEPOSIT') {
          totalInflow += amt
        } else if (tx.type === 'WITHDRAWAL') {
          totalOutflow += amt
        } else if (tx.type === 'TRANSFER') {
          // If destination belongs to user -> inflow, if source -> outflow
          const userAccountIds = new Set(accounts.map((a) => a.id))
          const isDest = userAccountIds.has(tx.destinationAccountId)
          const isSource = userAccountIds.has(tx.sourceAccountId)
          if (isDest && !isSource) totalInflow += amt
          else if (isSource && !isDest) totalOutflow += amt
        }
      }
    })

    return { totalInflow, totalOutflow }
  }, [transactions, accounts])

  const recentTransactions = transactions.slice(0, 5)

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="dashboard-content">
      {/* Welcome Banner */}
      <div className="welcome-banner-card">
        <div className="welcome-text-group">
          <span className="welcome-date">{todayFormatted}</span>
          <h2 className="welcome-heading">
            Welcome back, {user?.fullName || 'Valued Client'}
          </h2>
          <p className="welcome-subtext">
            Here is your live financial snapshot with real-time double-entry ledger verification.
          </p>
        </div>

        <div className="welcome-quick-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenMoneyAction('Transfer')}
            disabled={accounts.length === 0}
          >
            <IconTransfer className="w-4 h-4 mr-1.5" />
            Send Money
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onOpenMoneyAction('Deposit')}
            disabled={accounts.length === 0}
          >
            <IconDeposit className="w-4 h-4 mr-1.5" />
            Deposit
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-card-header">
            <span className="metric-label">Total Portfolio Balance</span>
            <span className="metric-icon-badge primary">₹</span>
          </div>
          <div className="metric-value font-mono">
            ₹ {formatBalance(totalBalance)}
          </div>
          <div className="metric-footer">
            <span className="metric-pill success">Verified Active</span>
            <span className="metric-sub">{accounts.length} Total Accounts</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Active Bank Accounts</span>
            <span className="metric-icon-badge">
              <IconAccounts className="w-4 h-4 text-primary" />
            </span>
          </div>
          <div className="metric-value font-mono">{activeAccountsCount}</div>
          <div className="metric-footer">
            <span className="metric-sub">
              {accounts.length - activeAccountsCount} Inactive / Frozen
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Money In (This Month)</span>
            <span className="metric-icon-badge success">↗</span>
          </div>
          <div className="metric-value text-emerald font-mono">
            + ₹ {formatBalance(monthlyTotals.totalInflow)}
          </div>
          <div className="metric-footer">
            <span className="metric-sub">Credits & deposits recorded</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Money Out (This Month)</span>
            <span className="metric-icon-badge danger">↘</span>
          </div>
          <div className="metric-value text-danger font-mono">
            - ₹ {formatBalance(monthlyTotals.totalOutflow)}
          </div>
          <div className="metric-footer">
            <span className="metric-sub">Withdrawals & outbound transfers</span>
          </div>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="quick-action-strip-card">
        <div className="action-strip-label">
          <strong>Quick Operations</strong>
          <span>Instant transfers and account operations with real-time settlement</span>
        </div>
        <div className="action-buttons-group">
          <button
            type="button"
            className="action-pill-btn"
            onClick={() => onOpenMoneyAction('Deposit')}
            disabled={accounts.length === 0}
          >
            <div className="action-icon-circle deposit">
              <IconDeposit className="w-4 h-4" />
            </div>
            <span>Deposit</span>
          </button>
          <button
            type="button"
            className="action-pill-btn"
            onClick={() => onOpenMoneyAction('Withdrawal')}
            disabled={accounts.length === 0}
          >
            <div className="action-icon-circle withdraw">
              <IconWithdraw className="w-4 h-4" />
            </div>
            <span>Withdraw</span>
          </button>
          <button
            type="button"
            className="action-pill-btn"
            onClick={() => onOpenMoneyAction('Transfer')}
            disabled={accounts.length === 0}
          >
            <div className="action-icon-circle transfer">
              <IconTransfer className="w-4 h-4" />
            </div>
            <span>Transfer</span>
          </button>
          <button
            type="button"
            className="action-pill-btn"
            onClick={onCreateAccount}
          >
            <div className="action-icon-circle new-account">
              <IconPlus className="w-4 h-4" />
            </div>
            <span>New Account</span>
          </button>
        </div>
      </div>

      {/* Accounts Carousel & Cards Section */}
      <div className="section-block">
        <div className="section-header-row">
          <div>
            <h3 className="section-title">My Accounts</h3>
            <p className="section-subtitle">Real-time balances for your verified accounts</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('accounts')}
          >
            Manage Accounts →
          </button>
        </div>

        {isLoading ? (
          <div className="loading-placeholder">Loading account records...</div>
        ) : accounts.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon-circle">▤</div>
            <h4>No Accounts Found</h4>
            <p>You have not opened a LedgerLine account yet. Create your first account in seconds.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onCreateAccount}
            >
              + Create First Account
            </button>
          </div>
        ) : (
          <div className="accounts-deck-grid">
            {accounts.map((acc) => (
              <div key={acc.id} className="bank-account-card">
                <div className="bank-account-header">
                  <span className="card-type-label">SAVINGS ACCOUNT</span>
                  <StatusBadge status={acc.status} />
                </div>

                <div className="account-number-row">
                  <span className="account-num font-mono">{acc.accountNumber}</span>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => copyToClipboard(acc.accountNumber, acc.id)}
                    title="Copy Account Number"
                  >
                    {copiedId === acc.id ? (
                      <IconCheck className="w-3.5 h-3.5 text-emerald" />
                    ) : (
                      <IconCopy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="account-balance-group">
                  <span className="balance-label">AVAILABLE BALANCE</span>
                  <div className="balance-amount font-mono">
                    <span className="currency-symbol">₹</span> {formatBalance(acc.balance)}
                  </div>
                </div>

                <div className="bank-account-footer">
                  <span className="account-id-hint">ID #{acc.id}</span>
                  <button
                    type="button"
                    className="btn-text-link"
                    onClick={() => onNavigateTab('ledger')}
                  >
                    View Ledger →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions Section */}
      <div className="section-block">
        <div className="section-header-row">
          <div>
            <h3 className="section-title">Recent Transactions</h3>
            <p className="section-subtitle">Real-time certified transaction activity</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('transactions')}
          >
            All Transactions →
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="empty-state-card">
            <p className="muted">No transactions recorded yet. Perform a deposit or transfer to see activity.</p>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="banking-table">
              <thead>
                <tr>
                  <th>TRANSACTION</th>
                  <th>DATE & TIME</th>
                  <th>TYPE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => {
                  const isCredit = tx.type === 'DEPOSIT'
                  const isDebit = tx.type === 'WITHDRAWAL'
                  return (
                    <tr key={tx.id}>
                      <td>
                        <div className="tx-cell-title">
                          <span className="tx-id font-mono">#{tx.id}</span>
                          <span className="tx-type-text">{tx.type}</span>
                        </div>
                      </td>
                      <td className="text-muted">{formatDate(tx.createdAt)}</td>
                      <td>
                        <span className="tx-type-pill">{tx.type}</span>
                      </td>
                      <td className="font-mono font-medium">
                        <span className={isCredit ? 'text-emerald' : isDebit ? 'text-danger' : ''}>
                          {isCredit ? '+ ' : isDebit ? '- ' : ''}₹ {formatBalance(tx.amount)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

