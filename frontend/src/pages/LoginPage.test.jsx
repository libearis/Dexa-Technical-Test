import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../context/useAuth';
import { LoginPage } from './LoginPage';

vi.mock('../context/useAuth');

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('submits the entered username/password and redirects HRD_ADMIN to /hrd', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ role: 'HRD_ADMIN' });
    useAuth.mockReturnValue({ login });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Username'), 'hrd.admin');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(login).toHaveBeenCalledWith('hrd.admin', 'password123');
    expect(navigateMock).toHaveBeenCalledWith('/hrd');
  });

  it('redirects EMPLOYEE accounts to /', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ role: 'EMPLOYEE' });
    useAuth.mockReturnValue({ login });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Username'), 'john.employee');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('shows the API error message when login fails', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue({
      response: { data: { message: 'Username atau password salah' } },
    });
    useAuth.mockReturnValue({ login });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Username'), 'wrong');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(
      await screen.findByText('Username atau password salah'),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('falls back to a generic error message when the API gives none', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(new Error('network down'));
    useAuth.mockReturnValue({ login });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Username'), 'bob');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Login gagal')).toBeInTheDocument();
  });
});
