import './Avatar.css';

// Placeholder until real profile photos exist — a generic person silhouette, not a computed avatar.
export function Avatar() {
  return (
    <div className="avatar-placeholder" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12Zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9Z" />
      </svg>
    </div>
  );
}
