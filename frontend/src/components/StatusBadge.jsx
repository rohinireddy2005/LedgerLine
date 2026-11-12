export default function StatusBadge({ status, type }) {
  const value = String(status || type || '').toUpperCase()

  let colorClass = 'badge-neutral'

  if (value === 'ACTIVE' || value === 'SUCCESS' || value === 'CREDIT' || value === 'RECONCILED' || value === 'POSTED') {
    colorClass = 'badge-success'
  } else if (value === 'FROZEN' || value === 'PENDING') {
    colorClass = 'badge-warning'
  } else if (value === 'CLOSED' || value === 'REJECTED' || value === 'DEBIT' || value === 'MISMATCH') {
    colorClass = 'badge-danger'
  } else if (value === 'ADMIN' || value === 'AUDITOR' || value === 'TRANSFER') {
    colorClass = 'badge-primary'
  }

  return (
    <span className={`status-badge ${colorClass}`}>
      <span className="status-badge-dot" />
      {value}
    </span>
  )
}

