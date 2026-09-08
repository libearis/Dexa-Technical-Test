import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../context/useAuth';
import { Navbar } from './Navbar';

vi.mock('../context/useAuth');

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('Navbar', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('shows only the title when there is no logged-in user', () => {
    useAuth.mockReturnValue({ user: null, logout: vi.fn() });
    render(<Navbar />);

    expect(screen.getByText('Absensi WFH')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });

  it("shows the user's name and role when logged in", () => {
    useAuth.mockReturnValue({
      user: { name: 'HRD Admin', role: 'HRD_ADMIN' },
      logout: vi.fn(),
    });
    render(<Navbar />);

    expect(screen.getByText('HRD Admin', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('(HRD_ADMIN)')).toBeInTheDocument();
  });

  it('logs out and redirects to /login when Logout is clicked', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    useAuth.mockReturnValue({ user: { name: 'Bob', role: 'EMPLOYEE' }, logout });
    render(<Navbar />);

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(logout).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });
});
