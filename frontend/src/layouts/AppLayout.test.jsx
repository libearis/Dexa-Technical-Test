import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../context/useAuth';
import { AppLayout } from './AppLayout';

vi.mock('../context/useAuth');

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/attendance']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/attendance" element={<div>Attendance Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('shows only the 2 shared menu items for an EMPLOYEE', () => {
    useAuth.mockReturnValue({ user: { name: 'Bob', role: 'EMPLOYEE' }, logout: vi.fn() });
    renderLayout();

    expect(screen.getByRole('link', { name: 'Absensi' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Riwayat Absensi' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Karyawan' })).not.toBeInTheDocument();
  });

  it('shows all 6 menu items for an HRD_ADMIN', () => {
    useAuth.mockReturnValue({
      user: { name: 'HRD Admin', role: 'HRD_ADMIN' },
      logout: vi.fn(),
    });
    renderLayout();

    const expectedLinks = [
      'Absensi',
      'Riwayat Absensi',
      'Dashboard',
      'Monitoring Absensi',
      'Karyawan',
      'Departemen',
    ];
    for (const name of expectedLinks) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it("shows the user's full name in the top header, with no raw role label", () => {
    useAuth.mockReturnValue({
      user: { name: 'HRD Admin', role: 'HRD_ADMIN' },
      logout: vi.fn(),
    });
    renderLayout();

    expect(screen.getByText('HRD Admin')).toBeInTheDocument();
    expect(screen.queryByText('HRD_ADMIN')).not.toBeInTheDocument();
  });

  it('logs out and redirects to /login when Logout is clicked', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    useAuth.mockReturnValue({ user: { name: 'Bob', role: 'EMPLOYEE' }, logout });
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(logout).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('renders the nested route content', () => {
    useAuth.mockReturnValue({ user: { name: 'Bob', role: 'EMPLOYEE' }, logout: vi.fn() });
    renderLayout();

    expect(screen.getByText('Attendance Content')).toBeInTheDocument();
  });

  it('toggles the sidebar open/closed via the header button', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: { name: 'Bob', role: 'EMPLOYEE' }, logout: vi.fn() });
    renderLayout();

    const toggle = screen.getByRole('button', { name: 'Tutup navigasi' });
    expect(screen.getByRole('link', { name: 'Absensi' }).closest('aside')).not.toHaveClass(
      'collapsed',
    );

    await user.click(toggle);
    expect(screen.getByRole('link', { name: 'Absensi' }).closest('aside')).toHaveClass(
      'collapsed',
    );

    await user.click(screen.getByRole('button', { name: 'Buka navigasi' }));
    expect(screen.getByRole('link', { name: 'Absensi' }).closest('aside')).not.toHaveClass(
      'collapsed',
    );
  });

  it('filters the menu as the search box is typed into', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({
      user: { name: 'HRD Admin', role: 'HRD_ADMIN' },
      logout: vi.fn(),
    });
    renderLayout();

    await user.type(screen.getByLabelText('Cari menu'), 'karya');

    expect(screen.getByRole('link', { name: 'Karyawan' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Absensi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('shows an empty state when the search matches nothing', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: { name: 'Bob', role: 'EMPLOYEE' }, logout: vi.fn() });
    renderLayout();

    await user.type(screen.getByLabelText('Cari menu'), 'zzz');

    expect(screen.getByText('Menu tidak ditemukan')).toBeInTheDocument();
  });
});
