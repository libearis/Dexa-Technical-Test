import { NavLink, Outlet } from 'react-router-dom';
import './HrdLayout.css';

export function HrdLayout() {
  return (
    <div className="hrd-layout">
      <nav className="hrd-tabs">
        <NavLink to="/hrd" end>
          Dashboard
        </NavLink>
        <NavLink to="/hrd/monitoring">Monitoring Absensi</NavLink>
        <NavLink to="/hrd/employees">Karyawan</NavLink>
        <NavLink to="/hrd/departments">Departemen</NavLink>
      </nav>
      <div className="hrd-content">
        <Outlet />
      </div>
    </div>
  );
}
