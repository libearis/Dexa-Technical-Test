import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <span className="navbar-title">Absensi WFH</span>
      {user && (
        <div className="navbar-user">
          <span>
            {user.name} <em>({user.role})</em>
          </span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </header>
  );
}
