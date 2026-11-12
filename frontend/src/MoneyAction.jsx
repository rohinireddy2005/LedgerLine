
import { useState } from 'react'
import API_BASE_URL from './config'

function createIdempotencyKey() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `ledgerline-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function MoneyAction({ action, accounts, onClose, onSuccess }) {
  const [accountId, setAccountId] = useState(
    String(accounts[0]?.id ?? '')
  )
  const [destinationId, setDestinationId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(
    createIdempotencyKey
  )

  function updateField(setter, value) {
    setter(value)
    setMessage('')
    setIdempotencyKey(createIdempotencyKey())
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (isSubmitting) return

    if (!accountId) {
      setMessage('Please select an account.')
      return
    }

    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage('Please enter a valid amount greater than zero.')
      return
    }

    const decimalPart = amount.split('.')[1]

    if (decimalPart && decimalPart.length > 2) {
      setMessage('Amount cannot have more than two decimal places.')
      return
    }

    if (action === 'Transfer') {
      if (!destinationId) {
        setMessage('Please select a destination account.')
        return
      }

      if (accountId === destinationId) {
        setMessage('Source and destination accounts must be different.')
        return
      }
    }

    const token = sessionStorage.getItem('ledgerline_access_token')

    if (!token) {
      setMessage('Your session has expired. Please log in again.')
      return
    }

    let endpoint
    let requestBody

    if (action === 'Deposit') {
      endpoint = '/api/transactions/deposit'
      requestBody = {
        accountId: Number(accountId),
        amount: numericAmount
      }
    } else if (action === 'Withdraw' || action === 'Withdrawal') {
      endpoint = '/api/transactions/withdraw'
      requestBody = {
        accountId: Number(accountId),
        amount: numericAmount
      }
    } else if (action === 'Transfer') {
      endpoint = '/api/transactions/transfer'
      requestBody = {
        sourceAccountId: Number(accountId),
        destinationAccountId: Number(destinationId),
        amount: numericAmount
      }
    } else {
      setMessage('Unknown transaction type.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMessage =
          result?.message ||
          result?.rejectionReason ||
          result?.reason ||
          result?.detail ||
          result?.error ||
          `Transaction failed. HTTP status: ${response.status}`

        setMessage(errorMessage)
        return
      }

      if (result?.status === 'REJECTED') {
        setMessage(
          result?.rejectionReason ||
          'The transaction was rejected by banking policy.'
        )
        return
      }

      setMessage(
        `${action} completed successfully!` +
        (result?.id ? ` Transaction ID: ${result.id}` : '')
      )

      setIdempotencyKey(createIdempotencyKey())

      if (onSuccess) {
        onSuccess()
      }
    } catch {
      setMessage(
        'Could not connect to banking service. Please check your network connection.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal money-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
        >
          ×
        </button>

        <h2>{action}</h2>
        <p>Enter the details to process your transaction.</p>

        <form className="money-form" onSubmit={handleSubmit}>
          <label htmlFor="sourceAccount">
            {action === 'Transfer' ? 'Source Account' : 'Account'}
          </label>

          <select
            id="sourceAccount"
            value={accountId}
            onChange={(event) =>
              updateField(setAccountId, event.target.value)
            }
            required
            disabled={isSubmitting || accounts.length === 0}
          >
            <option value="">Select an account</option>

            {accounts.map((account) => (
              <option key={account.id} value={String(account.id)}>
                {account.name} ({account.accountNumber})
              </option>
            ))}
          </select>

          {action === 'Transfer' && (
            <>
              <label htmlFor="destinationAccount">
                Destination Account
              </label>

              <select
                id="destinationAccount"
                value={destinationId}
                onChange={(event) =>
                  updateField(setDestinationId, event.target.value)
                }
                required
                disabled={isSubmitting}
              >
                <option value="">Select destination account</option>

                {accounts
                  .filter(
                    (account) => String(account.id) !== accountId
                  )
                  .map((account) => (
                    <option
                      key={account.id}
                      value={String(account.id)}
                    >
                      {account.name} ({account.accountNumber})
                    </option>
                  ))}
              </select>
            </>
          )}

          <label htmlFor="amount">Amount (INR)</label>

          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter amount"
            value={amount}
            onChange={(event) =>
              updateField(setAmount, event.target.value)
            }
            required
            disabled={isSubmitting}
          />

          <p className="demo-warning">
            All transactions are securely processed with real-time settlement.
          </p>

          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting || accounts.length === 0}
          >
            {isSubmitting ? 'Processing...' : `Confirm ${action}`}
          </button>
        </form>

        {message && (
          <div className="money-message" role="status">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default MoneyAction
