export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null

  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✕'}
          {type === 'warning' && '!'}
          {type === 'info' && 'ℹ'}
        </span>
        <span className="toast-message">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          className="toast-close"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  )
}

