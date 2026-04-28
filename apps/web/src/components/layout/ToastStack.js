import React from 'react';

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast toast-${toast.type || 'info'}`}>
          <div className="toast-dot" />
          <p>{toast.text}</p>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Zatvori poruku"
          >
            x
          </button>
        </article>
      ))}
    </div>
  );
}

export default ToastStack;
