import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const contextWithUser = (role?: string): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('allows the request through when the route has no @Roles() metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextWithUser('EMPLOYEE'))).toBe(true);
  });

  it('allows the request through when @Roles() is an empty list', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(contextWithUser('EMPLOYEE'))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue(['HRD_ADMIN']);
    expect(guard.canActivate(contextWithUser('HRD_ADMIN'))).toBe(true);
  });

  it('blocks a user whose role is not in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue(['HRD_ADMIN']);
    expect(guard.canActivate(contextWithUser('EMPLOYEE'))).toBe(false);
  });

  it('blocks a request with no authenticated user at all', () => {
    reflector.getAllAndOverride.mockReturnValue(['HRD_ADMIN']);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(false);
  });
});
