import { useState } from 'react'
import StatusBadge from '../../components/StatusBadge'
import { IconPlus, IconCopy, IconCheck, IconDeposit, IconWithdraw, IconTransfer, IconLedger } from '../../components/Icons'

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
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export default function MyAccountsView({
  accounts,
  onCreateAccount,
  onOpenMoneyAction,
  onNavigateTab,
  isCreating
}) {
  const [copiedId, setCopiedId] = useState('')

  function copyToClipboard(text, id) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(''), 2000)
    }
  }

  return (
    <div className="page-content-wrapper">
      <div className="page-title-bar">
        <div>
          <h2 className="page-main-heading">My Bank Accounts</h2>
          <p className="page-main-subtext">
            View, manage, and monitor balances across all your registered LedgerLine accounts.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onCreateAccount}
          disabled={isCreating}
        >
          <IconPlus className="w-4 h-4 mr-1.5" />
          {isCreating ? 'Opening Account...' : 'Open New Account'}
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="empty-state-card large">
          <div className="empty-icon-circle">▤</div>
          <h3>No Accounts Registered</h3>
          <p>You do not currently have any accounts. Open your first account to begin transacting.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onCreateAccount}
            disabled={isCreating}
          >
            + Create First Account
          </button>
        </div>
      ) : (
        <div className="accounts-management-grid">
          {accounts.map((acc) => (
            <div key={acc.id} className="account-details-card">
              <div className="account-card-top-bar">
                <div className="acc-tag">
                  <span className="dot active" />
                  <span>SAVINGS • {acc.currency}</span>
                </div>
                <StatusBadge status={acc.status} />
              </div>

              <div className="account-main-number-block">
                <span className="acc-number-label">ACCOUNT NUMBER</span>
                <div className="acc-number-with-copy">
                  <span className="number font-mono">{acc.accountNumber}</span>
                  <button
                    type="button"
                    className="btn-icon-copy"
                    onClick={() => copyToClipboard(acc.accountNumber, acc.id)}
                    title="Copy Account Number"
                  >
                    {copiedId === acc.id ? (
                      <IconCheck className="w-4 h-4 text-emerald" />
                    ) : (
                      <IconCopy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="account-card-balance-section">
                <span className="balance-hint">CURRENT BALANCE</span>
                <h3 className="balance-headline font-mono">
                  ₹ {formatBalance(acc.balance)}
                </h3>
              </div>

              <div className="account-card-metadata">
                <div className="meta-item">
                  <span className="meta-label">Account ID</span>
                  <span className="meta-val font-mono">#{acc.id}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Created Date</span>
                  <span className="meta-val">{formatDate(acc.createdAt)}</span>
                </div>
              </div>

              <div className="account-card-actions-toolbar">
                <button
                  type="button"
                  className="card-action-btn"
                  onClick={() => onOpenMoneyAction('Deposit')}
                  disabled={acc.status !== 'ACTIVE'}
                >
                  <IconDeposit className="w-3.5 h-3.5" />
                  <span>Deposit</span>
                </button>
                <button
                  type="button"
                  className="card-action-btn"
                  onClick={() => onOpenMoneyAction('Withdrawal')}
                  disabled={acc.status !== 'ACTIVE'}
                >
                  <IconWithdraw className="w-3.5 h-3.5" />
                  <span>Withdraw</span>
                </button>
                <button
                  type="button"
                  className="card-action-btn"
                  onClick={() => onOpenMoneyAction('Transfer')}
                  disabled={acc.status !== 'ACTIVE'}
                >
                  <IconTransfer className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
                <button
                  type="button"
                  className="card-action-btn highlight"
                  onClick={() => onNavigateTab('ledger')}
                >
                  <IconLedger className="w-3.5 h-3.5" />
                  <span>Ledger</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

