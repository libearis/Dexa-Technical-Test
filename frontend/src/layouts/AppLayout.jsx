import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../context/useAuth';
import './AppLayout.css';

const DASHBOARD_LINK = { to: '/dashboard', label: 'Dashboard' };

const EMPLOYEE_LINKS = [
  { to: '/attendance', label: 'Absensi' },
  { to: '/history', label: 'Riwayat Absensi' },
];

const HRD_LINKS = [
  { to: '/monitoring', label: 'Monitoring Absensi' },
  { to: '/employees', label: 'Karyawan' },
  { to: '/departments', label: 'Departemen' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');

  const links =
    user.role === 'HRD_ADMIN'
      ? [DASHBOARD_LINK, ...EMPLOYEE_LINKS, ...HRD_LINKS]
      : EMPLOYEE_LINKS;
  const filteredLinks = links.filter((link) =>
    link.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <Link to="/" className="sidebar-brand">
          <span className="brand-title">Absensi WFH</span>
          <span className="brand-sub">dexa group</span>
        </Link>

        <label className="sidebar-search">
          <span className="sr-only">Cari menu</span>
          <input
            type="search"
            placeholder="Cari menu..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <nav className="sidebar-nav">
          {filteredLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
          {filteredLinks.length === 0 && <p className="sidebar-empty">Menu tidak ditemukan</p>}
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarOpen ? 'Tutup navigasi' : 'Buka navigasi'}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="topbar-user">
            <Avatar />
            <span className="topbar-user-name">{user.name}</span>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
