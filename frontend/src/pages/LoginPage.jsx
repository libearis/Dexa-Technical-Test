import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import './LoginPage.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user.role === 'HRD_ADMIN' ? '/dashboard' : '/attendance');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-aside">
          <div className="login-aside-blob login-aside-blob-1" aria-hidden="true" />
          <div className="login-aside-blob login-aside-blob-2" aria-hidden="true" />
          <div className="login-aside-content">
            <span className="login-aside-title">Absensi WFH</span>
            <span className="login-aside-sub">dexa group</span>
            <p className="login-aside-tagline">
              Pantau dan kelola kehadiran tim Work From Home Anda dalam satu dashboard yang
              simpel dan real-time.
            </p>
          </div>
        </aside>

        <div className="login-main">
          <form className="login-card" onSubmit={handleSubmit}>
            <h1>Selamat Datang</h1>
            <p className="login-subtitle">Masuk dengan akun karyawan atau HRD Admin</p>

            <label>
              Username
              <div className="login-input-wrap">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12Zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9Z" />
                </svg>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label>
              Password
              <div className="login-input-wrap">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a4 4 0 0 0-4 4v3H7a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1V6a4 4 0 0 0-4-4Zm-2 7V6a2 2 0 1 1 4 0v3h-4Z" />
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
