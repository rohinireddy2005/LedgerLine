import { useState, useEffect, useRef } from 'react'
import API_BASE_URL from '../../config'
import Modal from '../../components/Modal'
import {
  IconDeposit,
  IconWithdraw,
  IconTransfer,
  IconCheck,
  IconAlertTriangle,
  IconDownload
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

  // Track opening transition so background data updates don't reset the modal
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
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
    wasOpenRef.current = isOpen
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
          throw new Error('Recipient account number not found.')
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
      setError('Please select an account.')
      return false
    }

    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError('Please enter an amount greater than zero.')
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
        throw new Error(data.rejectionReason || 'Transaction was declined by security policy.')
      }

      // Keep receipt open until user clicks Done
      setSuccessResult(data)
      setStep('success')
    } catch (err) {
      console.error('Transaction error:', err)
      setError(
        err.message || 'Unable to complete transaction. Please check your network connection.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Done button on Receipt closes modal and triggers parent refresh
  function handleCloseReceipt() {
    onClose()
    if (onSuccess) onSuccess()
  }

  // Download digital transaction receipt
  function handleDownloadReceipt() {
    if (!successResult) return
    const receiptContent = `========================================================
            LEDGERLINE DIGITAL BANKING
            OFFICIAL TRANSACTION RECEIPT
========================================================
Receipt Number  : #${successResult.id}
Reference ID    : ${successResult.idempotencyKey || 'N/A'}
Date & Time     : ${new Date(successResult.createdAt || Date.now()).toLocaleString('en-IN')}
Transaction Type: ${action.toUpperCase()}
Amount          : INR ${formatBalance(successResult.amount)}
Transfer Fee    : INR 0.00 (Zero Fee)
Payment Status  : SUCCESS / CONFIRMED
Source Account  : #${successResult.sourceAccountId || sourceAccountId || '—'}
${successResult.destinationAccountId ? `Destination Acc : #${successResult.destinationAccountId}\n` : ''}Payment Memo    : ${transferNote || 'N/A'}
========================================================
Thank you for banking with LedgerLine.
All transactions are verified and secured.
========================================================`

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `LedgerLine_Receipt_${successResult.id}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const modalTitle =
    step === 'success'
      ? 'Payment Receipt'
      : step === 'review'
        ? 'Confirm Transfer'
        : `${action} Funds`

  const modalSubtitle =
    step === 'success'
      ? 'Transaction settled and verified successfully'
      : step === 'review'
        ? 'Please review transaction details before authorizing'
        : action === 'Deposit'
          ? 'Add funds directly into your LedgerLine account'
          : action === 'Withdrawal'
            ? 'Withdraw funds securely from your account balance'
            : 'Send money instantly to any LedgerLine account'

  return (
    <Modal
      title={modalTitle}
      subtitle={modalSubtitle}
      isOpen={isOpen}
      onClose={step === 'success' ? handleCloseReceipt : onClose}
      maxWidth="520px"
    >
      {/* STEP: SUCCESS RECEIPT */}
      {step === 'success' && successResult ? (
        <div className="money-success-card">
          <div className="success-icon-badge">
            <IconCheck className="w-8 h-8 text-emerald" />
          </div>
          <h4>
            {action === 'Transfer'
              ? 'Transfer Sent Successfully!'
              : action === 'Deposit'
                ? 'Funds Credited Successfully!'
                : 'Withdrawal Processed!'}
          </h4>
          <p className="success-sub">
            Your transaction has been confirmed and settled.
          </p>

          <div className="transaction-receipt">
            <div className="receipt-row highlight">
              <span className="receipt-label">Amount Transacted</span>
              <span className="receipt-value font-bold text-emerald text-lg">
                ₹ {formatBalance(successResult.amount)}
              </span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Transaction ID</span>
              <span className="receipt-value font-mono">#{successResult.id}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Type</span>
              <span className="receipt-value font-semibold">{action.toUpperCase()}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Status</span>
              <span className="badge-pill success">COMPLETED</span>
            </div>
            {successResult.destinationAccountId && (
              <div className="receipt-row">
                <span className="receipt-label">Recipient Account</span>
                <span className="receipt-value font-mono">
                  #{successResult.destinationAccountId}
                </span>
              </div>
            )}
            <div className="receipt-row">
              <span className="receipt-label">Transfer Fee</span>
              <span className="receipt-value text-emerald font-semibold">₹ 0.00 (Zero Fee)</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Reference No</span>
              <span
                className="receipt-value font-mono text-xs truncate"
                title={successResult.idempotencyKey}
              >
                {successResult.idempotencyKey}
              </span>
            </div>
          </div>

          <div className="receipt-actions-row mt-4">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={handleDownloadReceipt}
            >
              <IconDownload className="w-4 h-4 mr-1.5 inline-icon" />
              Download Receipt
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={handleCloseReceipt}
            >
              Done
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
            <span className="review-hero-label">TRANSFER AMOUNT</span>
            <span className="review-hero-amount">₹ {formatBalance(amount)}</span>
            <span className="review-hero-sub">Instant zero-fee transfer</span>
          </div>

          <div className="review-breakdown-card">
            <div className="review-item">
              <span className="review-item-label">From Account:</span>
              <span className="review-item-value font-mono">
                {selectedSourceAccount?.accountNumber}
              </span>
            </div>

            <div className="review-item">
              <span className="review-item-label">To Recipient:</span>
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
              <span className="review-item-value text-emerald font-semibold">₹ 0.00 (Zero Fee)</span>
            </div>

            {transferNote && (
              <div className="review-item">
                <span className="review-item-label">Payment Memo:</span>
                <span className="review-item-value">{transferNote}</span>
              </div>
            )}

            <div className="review-divider" />

            <div className="review-item highlight">
              <span className="review-item-label">Available Balance After:</span>
              <span className="review-item-value font-mono font-bold">
                ₹{' '}
                {formatBalance(
                  Number(selectedSourceAccount?.balance || 0) - Number(amount || 0)
                )}
              </span>
            </div>
          </div>

          <div className="security-notice-badge mt-3">
            <span>🔒 256-Bit Bank Encryption • Fraud Protected</span>
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

          {/* Clean Funding Notification for Deposit */}
          {action === 'Deposit' && (
            <div className="funding-notice-card">
              <span className="funding-badge">INSTANT ACCOUNT FUNDING</span>
              <p className="funding-sub">
                Choose your deposit amount below. Funds are credited instantly to your chosen account with zero fees.
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
                  Between My Accounts
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
                      {lookupLoading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>

                  {recipientLookup && (
                    <div className="recipient-verified-card">
                      <IconCheck className="w-4 h-4 text-emerald" />
                      <span>
                        Verified: <strong>{recipientLookup.ownerDisplayName}</strong> ({recipientLookup.currency}) • {recipientLookup.status}
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

            {/* Quick Amount Suggestion Pills */}
            <div className="amount-quick-pills">
              {[500, 1000, 5000, 10000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setAmount(String(preset))}
                  disabled={loading}
                >
                  +₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {action === 'Transfer' && (
            <div className="form-group">
              <label htmlFor="transfer-note">Payment Memo <span className="text-xs text-muted">(Optional)</span></label>
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
            <span>🔒 256-Bit SSL Encrypted • Instant Settlement</span>
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
                  <IconDeposit className="w-4 h-4 mr-1.5 inline" />
                  Deposit Funds
                </>
              )}
              {action === 'Withdrawal' && (
                <>
                  <IconWithdraw className="w-4 h-4 mr-1.5 inline" />
                  Withdraw Funds
                </>
              )}
              {action === 'Transfer' && (
                <>
                  <IconTransfer className="w-4 h-4 mr-1.5 inline" />
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
