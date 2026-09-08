import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../context/useAuth';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('../context/useAuth');

function renderProtected({ allowedRoles, initialEntries = ['/protected'] }) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no logged-in user', () => {
    useAuth.mockReturnValue({ user: null });
    renderProtected({ allowedRoles: ['HRD_ADMIN'] });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it("redirects to / when the user's role is not allowed", () => {
    useAuth.mockReturnValue({ user: { role: 'EMPLOYEE' } });
    renderProtected({ allowedRoles: ['HRD_ADMIN'] });
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it("renders the nested route when the user's role is allowed", () => {
    useAuth.mockReturnValue({ user: { role: 'HRD_ADMIN' } });
    renderProtected({ allowedRoles: ['HRD_ADMIN'] });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders the nested route for any authenticated user when no roles are specified', () => {
    useAuth.mockReturnValue({ user: { role: 'EMPLOYEE' } });
    renderProtected({ allowedRoles: undefined });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
