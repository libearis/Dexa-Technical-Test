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

const MONITORING_GROUP = { label: 'Monitoring', links: [DASHBOARD_LINK, ...HRD_LINKS] };
const ATTENDANCE_GROUP = { label: 'Attendance', links: EMPLOYEE_LINKS };

function ChevronIcon({ open }) {
  return (
    <svg
      className={`nav-group-chevron${open ? ' nav-group-chevron--open' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function NavLinkItem({ link }) {
  return (
    <NavLink to={link.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
      {link.label}
    </NavLink>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  // Both groups start expanded — "collapsible" means the user *can* tidy up the nav,
  // not that HRD features are hidden by default. Collapsing is always available, even
  // for the group you're currently in — the search box is there for "where am I" instead.
  const [openGroups, setOpenGroups] = useState({ Monitoring: true, Attendance: true });

  const isHrd = user.role === 'HRD_ADMIN';
  const groups = isHrd ? [MONITORING_GROUP, ATTENDANCE_GROUP] : [];

  const term = search.trim().toLowerCase();
  const isSearching = term.length > 0;
  const matches = (link) => link.label.toLowerCase().includes(term);

  const toggleGroup = (label) => setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // While searching, groups stay visible as labels (not collapsible — filtering already
  // does the tidying) but only if at least one of their links actually matches.
  const searchGroups = groups
    .map((group) => ({ ...group, links: group.links.filter(matches) }))
    .filter((group) => group.links.length > 0);
  const searchFlatLinks = EMPLOYEE_LINKS.filter(matches);
  const hasSearchResults = isHrd ? searchGroups.length > 0 : searchFlatLinks.length > 0;

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
          {isSearching ? (
            <>
              {isHrd
                ? searchGroups.map((group) => (
                    <div className="nav-group" key={group.label}>
                      <div className="nav-group-header nav-group-header--label">
                        <span>{group.label}</span>
                      </div>
                      <div className="nav-group-links">
                        {group.links.map((link) => (
                          <NavLinkItem key={link.to} link={link} />
                        ))}
                      </div>
                    </div>
                  ))
                : searchFlatLinks.map((link) => <NavLinkItem key={link.to} link={link} />)}
              {!hasSearchResults && <p className="sidebar-empty">Menu tidak ditemukan</p>}
            </>
          ) : isHrd ? (
            groups.map((group) => {
              const open = Boolean(openGroups[group.label]);
              return (
                <div className="nav-group" key={group.label}>
                  <button
                    type="button"
                    className="nav-group-header"
                    aria-expanded={open}
                    onClick={() => toggleGroup(group.label)}
                  >
                    <span>{group.label}</span>
                    <ChevronIcon open={open} />
                  </button>
                  {open && (
                    <div className="nav-group-links">
                      {group.links.map((link) => (
                        <NavLinkItem key={link.to} link={link} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            EMPLOYEE_LINKS.map((link) => <NavLinkItem key={link.to} link={link} />)
          )}
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
