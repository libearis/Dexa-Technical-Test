import { useEffect } from 'react';
import './Toast.css';

export function Toast({ message, variant = 'error', onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!message || !duration) return undefined;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className={`toast toast-${variant}`} role="alert">
      {message}
    </div>
  );
}
