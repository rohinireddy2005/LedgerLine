import { useState, useEffect } from 'react'
import API_BASE_URL from '../../config'
import Modal from '../../components/Modal'
import {
  IconDeposit,
  IconWithdraw,
  IconTransfer,
  IconCheck,
  IconShield,
  IconAlertTriangle,
  IconLock
} from '../../components/Icons'

function generateIdempotencyKey() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return `ll-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function formatBalance(num) {
  return Number(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export default function MoneyModal({ action, accounts, isOpen, onClose, onSuccess }) {
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [transferMode, setTransferMode] = useState('recipientNumber') // 'myAccounts' or 'recipientNumber'
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('')
  const [recipientLookup, setRecipientLookup] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [amount, setAmount] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [step, setStep] = useState('input') // 'input' | 'review' | 'success'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successResult, setSuccessResult] = useState(null)
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey)

  useEffect(() => {
    if (isOpen) {
      if (accounts && accounts.length > 0) {
        setSourceAccountId(String(accounts[0].id))
      }
      setAmount('')
      setTransferNote('')
      setError('')
      setStep('input')
      setSuccessResult(null)
      setRecipientAccountNumber('')
      setRecipientLookup(null)
      setLookupError('')
      setIdempotencyKey(generateIdempotencyKey())
    }
  }, [isOpen, accounts])

  const selectedSourceAccount = accounts.find((acc) => String(acc.id) === String(sourceAccountId))
  const selectedDestAccount = accounts.find((acc) => String(acc.id) === String(destinationAccountId))

  async function handleVerifyRecipient(accountNumberToVerify) {
    const cleanNumber = (accountNumberToVerify || recipientAccountNumber).trim()
    if (!cleanNumber) return

    setLookupLoading(true)
    setLookupError('')
    setRecipientLookup(null)

    try {
      const token = sessionStorage.getItem('ledgerline_access_token')
      const response = await fetch(`${API_BASE_URL}/api/accounts/lookup/${cleanNumber}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Recipient account number not found in LedgerLine.')
        }
        throw new Error('Could not verify recipient account.')
      }

      const data = await response.json()
      setRecipientLookup(data)
    } catch (err) {
      setLookupError(err.message)
    } finally {
      setLookupLoading(false)
    }
  }

  function validateInput() {
    setError('')
    if (!sourceAccountId) {
      setError('Please select a source account.')
      return false
    }

    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than zero.')
      return false
    }

    if (action === 'Withdrawal' && selectedSourceAccount) {
      if (numAmount > Number(selectedSourceAccount.balance)) {
        setError(
          `Insufficient funds. Available balance is ₹ ${formatBalance(selectedSourceAccount.balance)}.`
        )
        return false
      }
    }

    if (action === 'Transfer') {
      if (transferMode === 'myAccounts') {
        if (!destinationAccountId) {
          setError('Please select a destination account.')
          return false
        }
        if (destinationAccountId === sourceAccountId) {
          setError('Source and destination accounts must be different.')
          return false
        }
      } else {
        if (!recipientAccountNumber.trim()) {
          setError('Please enter the recipient account number.')
          return false
        }
        if (
          selectedSourceAccount &&
          selectedSourceAccount.accountNumber === recipientAccountNumber.trim()
        ) {
          setError('You cannot transfer money to the same source account.')
          return false
        }
      }

      if (selectedSourceAccount && numAmount > Number(selectedSourceAccount.balance)) {
        setError(
          `Insufficient funds. Available balance is ₹ ${formatBalance(selectedSourceAccount.balance)}.`
        )
        return false
      }
    }

    return true
  }

  function handleProceedToReview(e) {
    e.preventDefault()
    if (validateInput()) {
      if (action === 'Transfer') {
        setStep('review')
      } else {
        executeTransaction()
      }
    }
  }

  async function executeTransaction() {
    setError('')
    const numAmount = Number(amount)

    const token = sessionStorage.getItem('ledgerline_access_token')
    if (!token) {
      setError('Your session has expired. Please log in again.')
      return
    }

    let endpoint = ''
    let payload = {}

    if (action === 'Deposit') {
      endpoint = '/api/transactions/deposit'
      payload = { accountId: Number(sourceAccountId), amount: numAmount }
    } else if (action === 'Withdrawal' || action === 'Withdraw') {
      endpoint = '/api/transactions/withdraw'
      payload = { accountId: Number(sourceAccountId), amount: numAmount }
    } else if (action === 'Transfer') {
      endpoint = '/api/transactions/transfer'
      payload = {
        sourceAccountId: Number(sourceAccountId),
        amount: numAmount,
        ...(transferMode === 'myAccounts'
          ? { destinationAccountId: Number(destinationAccountId) }
          : { destinationAccountNumber: recipientAccountNumber.trim() })
      }
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const msg =
          data?.message ||
          data?.rejectionReason ||
          data?.error ||
          `Transaction failed (Status: ${response.status}).`
        throw new Error(msg)
      }

      if (data?.status === 'REJECTED') {
        throw new Error(data.rejectionReason || 'Transaction was rejected by transaction policy.')
      }

      setSuccessResult(data)
      setStep('success')
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Transaction error:', err)
      setError(
        err.message || 'Unable to complete transaction. Please check your network connection.'
      )
    } finally {
      setLoading(false)
    }
  }

  const modalTitle = `${action} Funds`
  const modalSubtitle =
    action === 'Deposit'
      ? 'Credit funds directly into your LedgerLine account'
      : action === 'Withdrawal'
        ? 'Debit funds securely from your available account balance'
        : step === 'review'
          ? 'Review transfer summary and authorize settlement'
          : 'Transfer funds instantly with double-entry ledger verification'

  return (
    <Modal
      title={modalTitle}
      subtitle={modalSubtitle}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="520px"
    >
      {/* STEP: SUCCESS RECEIPT */}
      {step === 'success' && successResult ? (
        <div className="money-success-card">
          <div className="success-icon-badge">
            <IconCheck className="w-8 h-8 text-emerald" />
          </div>
          <h4>Transaction Completed Successfully!</h4>
          <p className="success-sub">
            Your {action.toLowerCase()} was verified and recorded in the double-entry ledger.
          </p>

          <div className="transaction-receipt">
            <div className="receipt-row">
              <span className="receipt-label">Transaction ID</span>
              <span className="receipt-value font-mono">#{successResult.id}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Type</span>
              <span className="receipt-value font-bold">{action.toUpperCase()}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Amount</span>
              <span className="receipt-value font-bold text-emerald">
                ₹ {formatBalance(successResult.amount)}
              </span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Status</span>
              <span className="badge-pill success">SUCCESS</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Reference ID</span>
              <span
                className="receipt-value font-mono text-xs truncate"
                title={successResult.idempotencyKey}
              >
                {successResult.idempotencyKey}
              </span>
            </div>
          </div>

          <div className="modal-actions-single mt-4">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={onClose}
            >
              Done & Return to Dashboard
            </button>
          </div>
        </div>
      ) : step === 'review' && action === 'Transfer' ? (
        /* STEP: TRANSFER REVIEW & CONFIRMATION */
        <div className="transfer-review-container">
          {error && (
            <div className="form-alert error mb-4">
              <IconAlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="review-hero-card">
            <span className="review-hero-label">TRANSFER TOTAL</span>
            <span className="review-hero-amount">₹ {formatBalance(amount)}</span>
            <span className="review-hero-sub">Settled instantly via Double-Entry Ledger</span>
          </div>

          <div className="review-breakdown-card">
            <div className="review-item">
              <span className="review-item-label">Source Account:</span>
              <span className="review-item-value font-mono">
                {selectedSourceAccount?.accountNumber}
              </span>
            </div>

            <div className="review-item">
              <span className="review-item-label">Recipient:</span>
              <span className="review-item-value font-semibold">
                {transferMode === 'recipientNumber'
                  ? recipientLookup?.ownerDisplayName || recipientAccountNumber
                  : selectedDestAccount?.accountNumber}
              </span>
            </div>

            {transferMode === 'recipientNumber' && (
              <div className="review-item">
                <span className="review-item-label">Recipient Account:</span>
                <span className="review-item-value font-mono">{recipientAccountNumber}</span>
              </div>
            )}

            <div className="review-item">
              <span className="review-item-label">Transfer Fee:</span>
              <span className="review-item-value text-emerald font-semibold">₹ 0.00 (Free)</span>
            </div>

            {transferNote && (
              <div className="review-item">
                <span className="review-item-label">Payment Memo:</span>
                <span className="review-item-value">{transferNote}</span>
              </div>
            )}

            <div className="review-divider" />

            <div className="review-item highlight">
              <span className="review-item-label">Net Balance After Transfer:</span>
              <span className="review-item-value font-mono font-bold">
                ₹{' '}
                {formatBalance(
                  Number(selectedSourceAccount?.balance || 0) - Number(amount || 0)
                )}
              </span>
            </div>
          </div>

          <div className="security-notice-badge mt-3">
            <IconLock className="w-3.5 h-3.5 text-emerald inline mr-1" />
            <span>End-to-End Encrypted • Spring Security + Idempotency Protection</span>
          </div>

          <div className="modal-footer-actions mt-4">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep('input')}
              disabled={loading}
            >
              ← Back to Edit
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={executeTransaction}
              disabled={loading}
            >
              {loading ? 'Authorizing Transfer...' : 'Confirm & Send Money'}
            </button>
          </div>
        </div>
      ) : (
        /* STEP: NORMAL INPUT FORM */
        <form onSubmit={handleProceedToReview} className="money-form">
          {error && (
            <div className="form-alert error">
              <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sandbox Simulation Notice for Deposit */}
          {action === 'Deposit' && (
            <div className="sandbox-simulation-banner">
              <span className="simulation-tag">SIMULATION GATEWAY</span>
              <p className="simulation-text">
                This is a sandbox environment. Deposits credit simulated test funds immediately to
                your account for evaluation without charging external bank accounts.
              </p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="source-acc-select">
              {action === 'Transfer' ? 'From Account' : 'Account'}
            </label>
            <select
              id="source-acc-select"
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              disabled={loading || accounts.length === 0}
              required
            >
              <option value="">Select Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} — Available: ₹ {formatBalance(acc.balance)} ({acc.status})
                </option>
              ))}
            </select>
            {selectedSourceAccount && (
              <span className="field-hint">
                Available balance: <strong>₹ {formatBalance(selectedSourceAccount.balance)} INR</strong>
              </span>
            )}
          </div>

          {action === 'Transfer' && (
            <div className="transfer-destination-section">
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segment-btn ${transferMode === 'recipientNumber' ? 'active' : ''}`}
                  onClick={() => setTransferMode('recipientNumber')}
                >
                  Pay by Account Number
                </button>
                <button
                  type="button"
                  className={`segment-btn ${transferMode === 'myAccounts' ? 'active' : ''}`}
                  onClick={() => setTransferMode('myAccounts')}
                >
                  Transfer Between My Accounts
                </button>
              </div>

              {transferMode === 'recipientNumber' ? (
                <div className="form-group">
                  <label htmlFor="recipient-acc-input">Recipient Account Number</label>
                  <div className="input-with-action">
                    <input
                      id="recipient-acc-input"
                      type="text"
                      placeholder="e.g. LL012345678901"
                      value={recipientAccountNumber}
                      onChange={(e) => {
                        setRecipientAccountNumber(e.target.value)
                        setRecipientLookup(null)
                        setLookupError('')
                      }}
                      onBlur={() => handleVerifyRecipient()}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleVerifyRecipient()}
                      disabled={loading || lookupLoading || !recipientAccountNumber.trim()}
                    >
                      {lookupLoading ? 'Checking...' : 'Verify'}
                    </button>
                  </div>

                  {recipientLookup && (
                    <div className="recipient-verified-card">
                      <IconCheck className="w-4 h-4 text-emerald" />
                      <span>
                        Verified: <strong>{recipientLookup.ownerDisplayName}</strong> ({recipientLookup.currency}) • Status: {recipientLookup.status}
                      </span>
                    </div>
                  )}

                  {lookupError && <div className="field-error-hint">{lookupError}</div>}
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="dest-acc-select">Destination Account</label>
                  <select
                    id="dest-acc-select"
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                    disabled={loading}
                    required
                  >
                    <option value="">Select destination</option>
                    {accounts
                      .filter((acc) => String(acc.id) !== String(sourceAccountId))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountNumber} — ₹ {formatBalance(acc.balance)}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="amount-input">Amount (INR)</label>
            <div className="amount-input-wrapper">
              <span className="currency-prefix">₹</span>
              <input
                id="amount-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <span className="field-hint">Maximum 2 decimal places. Insured & protected.</span>
          </div>

          {action === 'Transfer' && (
            <div className="form-group">
              <label htmlFor="transfer-note">Payment Memo / Note <span className="text-xs text-muted">(Optional)</span></label>
              <input
                id="transfer-note"
                type="text"
                placeholder="e.g. Monthly rent, Invoice #104"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                maxLength={60}
                disabled={loading}
              />
            </div>
          )}

          <div className="security-notice-badge">
            <IconShield className="w-3.5 h-3.5 text-emerald inline mr-1" />
            <span>Instant Double-Entry Settlement • Bank-Grade Security</span>
          </div>

          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || accounts.length === 0}
            >
              {action === 'Deposit' && (
                <>
                  <IconDeposit className="w-4 h-4 mr-1 inline" />
                  Deposit Funds
                </>
              )}
              {action === 'Withdrawal' && (
                <>
                  <IconWithdraw className="w-4 h-4 mr-1 inline" />
                  Withdraw Funds
                </>
              )}
              {action === 'Transfer' && (
                <>
                  <IconTransfer className="w-4 h-4 mr-1 inline" />
                  Review Transfer →
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
