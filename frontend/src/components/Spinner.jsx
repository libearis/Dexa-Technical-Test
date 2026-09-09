import './Spinner.css';

export function Spinner({ label = 'Memuat...' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
