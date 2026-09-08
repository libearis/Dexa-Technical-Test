import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attendanceApi } from '../api/attendanceApi';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';

vi.mock('../api/attendanceApi', () => ({
  attendanceApi: { post: vi.fn() },
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('throws when used outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider',
    );
  });

  it('starts with no user when nothing is in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('restores the user from localStorage on mount', () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Bob' }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toEqual({ id: 1, name: 'Bob' });
  });

  it('login stores the token/user and updates state', async () => {
    const apiUser = { id: 1, name: 'Bob', role: 'EMPLOYEE' };
    attendanceApi.post.mockResolvedValue({
      data: { accessToken: 'token-123', user: apiUser },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('bob', 'secret');
    });

    expect(attendanceApi.post).toHaveBeenCalledWith('/auth/login', {
      username: 'bob',
      password: 'secret',
    });
    expect(result.current.user).toEqual(apiUser);
    expect(localStorage.getItem('accessToken')).toBe('token-123');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(apiUser);
  });

  it('logout clears storage and state', async () => {
    localStorage.setItem('accessToken', 'token-123');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
