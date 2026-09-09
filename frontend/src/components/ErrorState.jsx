import './ErrorState.css';

export function ErrorState({
  title = 'Terjadi Kesalahan',
  message = 'Data tidak dapat dimuat. Coba lagi beberapa saat lagi.',
  onRetry,
  compact = false,
}) {
  return (
    <div className={`error-state${compact ? ' error-state--compact' : ''}`}>
      <div className="error-state-code">500</div>
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Coba Lagi
        </button>
      )}
    </div>
  );
}
