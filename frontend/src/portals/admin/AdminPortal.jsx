import { useState, useEffect, useCallback } from 'react'
import API_BASE_URL from '../../config'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import {
  IconAccounts,
  IconReconciliation,
  IconUsers,
  IconAudit,
  IconLock,
  IconUnlock,
  IconShield,
  IconCheck,
  IconAlertTriangle,
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

export default function AdminPortal({ activeTab, onNavigateTab }) {
  // Accounts State
  const [accounts, setAccounts] = useState([])
  const [accountsPage, setAccountsPage] = useState(0)
  const [accountsTotalPages, setAccountsTotalPages] = useState(0)
  const [accountsTotalElements, setAccountsTotalElements] = useState(0)

  // Users State
  const [users, setUsers] = useState([])
  const [usersPage, setUsersPage] = useState(0)
  const [usersTotalPages, setUsersTotalPages] = useState(0)
  const [usersTotalElements, setUsersTotalElements] = useState(0)

  // Audits State
  const [audits, setAudits] = useState([])
  const [auditsPage, setAuditsPage] = useState(0)
  const [auditsTotalPages, setAuditsTotalPages] = useState(0)
  const [auditsTotalElements, setAuditsTotalElements] = useState(0)

  // Reconciliation State
  const [selectedReconcileAccId, setSelectedReconcileAccId] = useState('')
  const [reconciliationResult, setReconciliationResult] = useState(null)
  const [reconcileLoading, setReconcileLoading] = useState(false)
  const [reconcileError, setReconcileError] = useState('')

  // Status Action Modal State
  const [actionAccount, setActionAccount] = useState(null) // account object
  const [actionType, setActionType] = useState('') // 'freeze', 'unfreeze', 'close'
  const [actionReason, setActionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  const token = sessionStorage.getItem('ledgerline_access_token')

  const fetchAccounts = useCallback(async (page = 0) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/accounts?page=${page}&size=10`, {
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

  const fetchUsers = useCallback(async (page = 0) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users?page=${page}&size=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })
      if (!res.ok) throw new Error('Failed to load users')
      const data = await res.json()
      setUsers(data.content || [])
      setUsersPage(data.number || 0)
      setUsersTotalPages(data.totalPages || 0)
      setUsersTotalElements(data.totalElements || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchAudits = useCallback(async (page = 0) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/audits?page=${page}&size=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })
      if (!res.ok) throw new Error('Failed to load status audits')
      const data = await res.json()
      setAudits(data.content || [])
      setAuditsPage(data.number || 0)
      setAuditsTotalPages(data.totalPages || 0)
      setAuditsTotalElements(data.totalElements || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchAccounts(0)
    fetchUsers(0)
    fetchAudits(0)
  }, [fetchAccounts, fetchUsers, fetchAudits])

  async function handleExecuteStatusChange(e) {
    e.preventDefault()
    if (!actionAccount || !actionType) return
    if (!actionReason.trim()) {
      setActionError('Administrative reason is strictly mandatory.')
      return
    }

    setActionLoading(true)
    setActionError('')

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/accounts/${actionAccount.id}/${actionType}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reason: actionReason.trim() })
        }
      )

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message || data?.detail || `Failed to ${actionType} account.`)
      }

      setFeedback(`Account ${actionAccount.accountNumber} successfully ${actionType}d.`)
      setActionAccount(null)
      setActionType('')
      setActionReason('')
      fetchAccounts(accountsPage)
      fetchAudits(0)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function runReconciliation(accountId) {
    const idToReconcile = accountId || selectedReconcileAccId
    if (!idToReconcile) return

    setReconcileLoading(true)
    setReconcileError('')
    setReconciliationResult(null)

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/accounts/${idToReconcile}/reconciliation`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Reconciliation failed.')
      }

      const data = await res.json()
      setReconciliationResult(data)
    } catch (err) {
      setReconcileError(err.message)
    } finally {
      setReconcileLoading(false)
    }
  }

  return (
    <div className="page-content-wrapper admin-portal">
      {feedback && (
        <div className="form-alert success mb-4">
          <span>✓</span>
          <span>{feedback}</span>
          <button
            type="button"
            className="btn-text-close ml-auto"
            onClick={() => setFeedback('')}
          >
            ×
          </button>
        </div>
      )}

      {/* ADMIN OVERVIEW TAB */}
      {activeTab === 'admin-overview' && (
        <div className="admin-overview-view">
          <div className="page-title-bar">
            <div>
              <h2 className="page-main-heading">Administrator Control Center</h2>
              <p className="page-main-subtext">
                System oversight, account lifecycle management, and financial reconciliation.
              </p>
            </div>
            <div className="admin-badge-indicator">
              <IconShield className="w-4 h-4 text-primary" />
              <span>SUPERUSER ACCESS</span>
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card primary">
              <div className="metric-card-header">
                <span className="metric-label">TOTAL REGISTERED USERS</span>
                <span className="metric-icon-badge">
                  <IconUsers className="w-4 h-4" />
                </span>
              </div>
              <div className="metric-value font-mono">{usersTotalElements}</div>
              <div className="metric-footer">
                <span className="metric-sub">Account holders & privileged staff</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-label">TOTAL BANK ACCOUNTS</span>
                <span className="metric-icon-badge">
                  <IconAccounts className="w-4 h-4" />
                </span>
              </div>
              <div className="metric-value font-mono">{accountsTotalElements}</div>
              <div className="metric-footer">
                <span className="metric-sub">Active institutional deposits</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-label">STATUS AUDIT EVENTS</span>
                <span className="metric-icon-badge">
                  <IconAudit className="w-4 h-4" />
                </span>
              </div>
              <div className="metric-value font-mono">{auditsTotalElements}</div>
              <div className="metric-footer">
                <span className="metric-sub">Permanent compliance events</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-label">SYSTEM INTEGRITY</span>
                <span className="metric-icon-badge success">✓</span>
              </div>
              <div className="metric-value text-emerald">Active</div>
              <div className="metric-footer">
                <span className="metric-sub">Real-time system health optimal</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="quick-action-strip-card mt-6">
            <div className="action-strip-label">
              <strong>Administrative Modules</strong>
              <span>Direct access to compliance and governance tools</span>
            </div>
            <div className="action-buttons-group">
              <button
                type="button"
                className="action-pill-btn"
                onClick={() => onNavigateTab('admin-accounts')}
              >
                <div className="action-icon-circle transfer">
                  <IconAccounts className="w-4 h-4" />
                </div>
                <span>Account Controls</span>
              </button>
              <button
                type="button"
                className="action-pill-btn"
                onClick={() => onNavigateTab('admin-reconciliation')}
              >
                <div className="action-icon-circle deposit">
                  <IconReconciliation className="w-4 h-4" />
                </div>
                <span>Run Reconciliation</span>
              </button>
              <button
                type="button"
                className="action-pill-btn"
                onClick={() => onNavigateTab('admin-users')}
              >
                <div className="action-icon-circle new-account">
                  <IconUsers className="w-4 h-4" />
                </div>
                <span>User Directory</span>
              </button>
              <button
                type="button"
                className="action-pill-btn"
                onClick={() => onNavigateTab('admin-audits')}
              >
                <div className="action-icon-circle withdraw">
                  <IconAudit className="w-4 h-4" />
                </div>
                <span>Status Audits</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT CONTROLS TAB */}
      {activeTab === 'admin-accounts' && (
        <div className="admin-accounts-view">
          <div className="page-title-bar">
            <div>
              <h2 className="page-main-heading">Account Lifecycle Controls</h2>
              <p className="page-main-subtext">
                Enforce operational compliance by freezing, unfreezing, or closing accounts with audit logging.
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
                  <th>OWNER NAME</th>
                  <th>OWNER EMAIL</th>
                  <th>BALANCE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <span className="font-mono font-bold text-primary">{acc.accountNumber}</span>
                      <span className="text-xs text-muted block">ID #{acc.id}</span>
                    </td>
                    <td>{acc.ownerName}</td>
                    <td className="text-muted text-xs">{acc.ownerEmail}</td>
                    <td className="font-mono font-bold">₹ {formatBalance(acc.balance)}</td>
                    <td>
                      <StatusBadge status={acc.status} />
                    </td>
                    <td>
                      <div className="table-actions-cluster">
                        {acc.status === 'ACTIVE' && (
                          <button
                            type="button"
                            className="btn btn-warning btn-xs"
                            onClick={() => {
                              setActionAccount(acc)
                              setActionType('freeze')
                              setActionReason('')
                              setActionError('')
                            }}
                          >
                            <IconLock className="w-3 h-3 mr-1 inline" />
                            Freeze
                          </button>
                        )}
                        {acc.status === 'FROZEN' && (
                          <button
                            type="button"
                            className="btn btn-success btn-xs"
                            onClick={() => {
                              setActionAccount(acc)
                              setActionType('unfreeze')
                              setActionReason('')
                              setActionError('')
                            }}
                          >
                            <IconUnlock className="w-3 h-3 mr-1 inline" />
                            Unfreeze
                          </button>
                        )}
                        {(acc.status === 'ACTIVE' || acc.status === 'FROZEN') && (
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => {
                              setActionAccount(acc)
                              setActionType('close')
                              setActionReason('')
                              setActionError('')
                            }}
                            title={
                              Number(acc.balance) !== 0
                                ? 'Account balance must be zero to close'
                                : 'Close account'
                            }
                          >
                            Close
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => {
                            setSelectedReconcileAccId(String(acc.id))
                            onNavigateTab('admin-reconciliation')
                            runReconciliation(acc.id)
                          }}
                        >
                          Reconcile
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {accountsTotalPages > 1 && (
            <div className="table-pagination-bar">
              <span className="pagination-info">
                Page {accountsPage + 1} of {accountsTotalPages} ({accountsTotalElements} total accounts)
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

      {/* RECONCILIATION DASHBOARD TAB */}
      {activeTab === 'admin-reconciliation' && (
        <div className="admin-reconciliation-view">
          <div className="page-title-bar">
            <div>
              <h2 className="page-main-heading">Financial Reconciliation Engine</h2>
              <p className="page-main-subtext">
                Automatically reconciles live account balances against the chronological double-entry ledger to guarantee financial consistency.
              </p>
            </div>
          </div>

          <div className="reconciliation-control-card">
            <div className="form-group flex-1">
              <label htmlFor="reconcile-select">Select Account to Reconcile</label>
              <select
                id="reconcile-select"
                value={selectedReconcileAccId}
                onChange={(e) => setSelectedReconcileAccId(e.target.value)}
                disabled={reconcileLoading}
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} — {acc.ownerName} (Balance: ₹ {formatBalance(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary self-end"
              onClick={() => runReconciliation()}
              disabled={!selectedReconcileAccId || reconcileLoading}
            >
              {reconcileLoading ? 'Running Verification...' : 'Execute Reconciliation'}
            </button>
          </div>

          {reconcileError && (
            <div className="form-alert error my-4">
              <span>✕</span>
              <span>{reconcileError}</span>
            </div>
          )}

          {reconciliationResult && (
            <div className="reconciliation-report-card">
              <div className="report-header">
                <div className="report-title-group">
                  <h3 className="report-title">
                    Reconciliation Report: {reconciliationResult.accountNumber}
                  </h3>
                  <span className="report-subtitle">
                    Account ID #{reconciliationResult.accountId} • Real-Time Core Reconciliation
                  </span>
                </div>
                <div className="report-verdict-badge">
                  {reconciliationResult.reconciled ? (
                    <span className="badge-pill success">
                      <IconCheck className="w-4 h-4 mr-1 inline" />
                      100% RECONCILED
                    </span>
                  ) : (
                    <span className="badge-pill danger">
                      <IconAlertTriangle className="w-4 h-4 mr-1 inline" />
                      DISCREPANCY DETECTED
                    </span>
                  )}
                </div>
              </div>

              <div className="reconciliation-comparison-grid">
                <div className="reconcile-stat-card">
                  <span className="stat-label">STORED ACCOUNT BALANCE</span>
                  <span className="stat-val font-mono">
                    ₹ {formatBalance(reconciliationResult.accountBalance)}
                  </span>
                  <span className="stat-sub">From <code>accounts</code> table</span>
                </div>

                <div className="reconcile-stat-card">
                  <span className="stat-label">CALCULATED LEDGER BALANCE</span>
                  <span className="stat-val font-mono text-emerald">
                    ₹ {formatBalance(reconciliationResult.calculatedBalance)}
                  </span>
                  <span className="stat-sub">Sum of all chronological credits & debits</span>
                </div>

                <div className="reconcile-stat-card">
                  <span className="stat-label">TOTAL LEDGER ENTRIES</span>
                  <span className="stat-val font-mono">
                    {reconciliationResult.totalEntries}
                  </span>
                  <span className="stat-sub">Double-entry verified records</span>
                </div>
              </div>

              <div className="reconciliation-verdict-banner">
                <strong>Verification Outcome:</strong>
                <p>{reconciliationResult.message}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* USER REGISTRY TAB */}
      {activeTab === 'admin-users' && (
        <div className="admin-users-view">
          <div className="page-title-bar">
            <div>
              <h2 className="page-main-heading">User Registry</h2>
              <p className="page-main-subtext">
                All registered clients, administrators, and auditors in the system.
              </p>
            </div>
          </div>

          <div className="table-responsive-container">
            <table className="banking-table">
              <thead>
                <tr>
                  <th>USER ID</th>
                  <th>FULL NAME</th>
                  <th>EMAIL ADDRESS</th>
                  <th>SYSTEM ROLE</th>
                  <th>JOINED DATE</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-mono text-muted">#{u.id}</td>
                    <td className="font-semibold">{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>
                      <StatusBadge status={u.role} />
                    </td>
                    <td className="text-muted text-xs">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usersTotalPages > 1 && (
            <div className="table-pagination-bar">
              <span className="pagination-info">
                Page {usersPage + 1} of {usersTotalPages} ({usersTotalElements} users)
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchUsers(usersPage - 1)}
                  disabled={usersPage === 0 || loading}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchUsers(usersPage + 1)}
                  disabled={usersPage >= usersTotalPages - 1 || loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATUS AUDITS TAB */}
      {activeTab === 'admin-audits' && (
        <div className="admin-audits-view">
          <div className="page-title-bar">
            <div>
              <h2 className="page-main-heading">Account Status Audit Trail</h2>
              <p className="page-main-subtext">
                Permanent chronological record of every account status modification.
              </p>
            </div>
          </div>

          <div className="table-responsive-container">
            <table className="banking-table">
              <thead>
                <tr>
                  <th>AUDIT ID</th>
                  <th>ACCOUNT ID</th>
                  <th>TRANSITION</th>
                  <th>ADMINISTRATOR</th>
                  <th>REASON</th>
                  <th>RECORDED AT</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-muted">#{a.id}</td>
                    <td className="font-mono font-bold text-primary">#{a.accountId}</td>
                    <td>
                      <span className="status-transition">
                        <StatusBadge status={a.previousStatus} />
                        <span className="arrow">→</span>
                        <StatusBadge status={a.newStatus} />
                      </span>
                    </td>
                    <td className="text-xs">{a.adminEmail}</td>
                    <td className="text-sm font-medium">{a.reason}</td>
                    <td className="text-muted text-xs">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {auditsTotalPages > 1 && (
            <div className="table-pagination-bar">
              <span className="pagination-info">
                Page {auditsPage + 1} of {auditsTotalPages} ({auditsTotalElements} audit records)
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchAudits(auditsPage - 1)}
                  disabled={auditsPage === 0 || loading}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchAudits(auditsPage + 1)}
                  disabled={auditsPage >= auditsTotalPages - 1 || loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Action Confirmation Modal */}
      {actionAccount && (
        <Modal
          title={`${actionType.toUpperCase()} Account #${actionAccount.accountNumber}`}
          subtitle="Mandatory Administrative Change Authorization"
          isOpen={Boolean(actionAccount)}
          onClose={() => setActionAccount(null)}
          maxWidth="500px"
        >
          <form onSubmit={handleExecuteStatusChange} className="status-change-form">
            {actionError && (
              <div className="form-alert error">
                <span>✕</span>
                <span>{actionError}</span>
              </div>
            )}

            <div className="action-warning-banner">
              <IconAlertTriangle className="w-5 h-5 text-amber" />
              <div>
                <strong>Administrative Compliance Notice:</strong>
                <p>
                  This action permanently logs a compliance audit record. A valid business justification is required.
                </p>
              </div>
            </div>

            <div className="detail-rows-list my-3">
              <div className="detail-row">
                <span className="detail-key">Account Number</span>
                <span className="detail-val font-mono">{actionAccount.accountNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Current Status</span>
                <span className="detail-val">
                  <StatusBadge status={actionAccount.status} />
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Current Balance</span>
                <span className="detail-val font-mono">₹ {formatBalance(actionAccount.balance)}</span>
              </div>
            </div>

            {actionType === 'close' && Number(actionAccount.balance) !== 0 && (
              <div className="form-alert error mb-3">
                Cannot close an account with a non-zero balance. Account balance must be exactly ₹ 0.00.
              </div>
            )}

            <div className="form-group">
              <label htmlFor="action-reason">
                Administrative Reason <span className="text-danger">*</span>
              </label>
              <textarea
                id="action-reason"
                rows="3"
                className="reason-textarea"
                placeholder="State the regulatory, fraud investigation, or customer request reason..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                required
                disabled={actionLoading}
              />
              <span className="field-hint">Minimum 3 characters, max 500 characters.</span>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setActionAccount(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${actionType === 'unfreeze' ? 'btn-success' : 'btn-danger'}`}
                disabled={
                  actionLoading ||
                  !actionReason.trim() ||
                  (actionType === 'close' && Number(actionAccount.balance) !== 0)
                }
              >
                {actionLoading ? 'Executing...' : `Confirm ${actionType.toUpperCase()}`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
