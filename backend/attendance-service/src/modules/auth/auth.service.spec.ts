import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { EmployeeLookupService } from '../employees/employee-lookup.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let employeeLookupService: jest.Mocked<EmployeeLookupService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: EmployeeLookupService,
          useValue: { findByUsername: jest.fn() },
        },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
    employeeLookupService = module.get(EmployeeLookupService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('rejects an unknown username', async () => {
      employeeLookupService.findByUsername.mockResolvedValue(null);

      await expect(
        service.login({ username: 'ghost', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a deactivated employee, before even checking the password', async () => {
      employeeLookupService.findByUsername.mockResolvedValue({
        id: 1,
        status: 'INACTIVE',
        password: 'hashed',
      } as any);

      await expect(
        service.login({ username: 'bob', password: 'x' }),
      ).rejects.toThrow('Akun karyawan tidak aktif');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects a wrong password', async () => {
      employeeLookupService.findByUsername.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
        password: 'hashed',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'bob', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues a token and a password-free user object on success', async () => {
      employeeLookupService.findByUsername.mockResolvedValue({
        id: 1,
        name: 'Bob',
        username: 'bob',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        password: 'hashed',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('signed-token');

      const result = await service.login({ username: 'bob', password: 'ok' });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        username: 'bob',
        role: 'EMPLOYEE',
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.user).not.toHaveProperty('password');
    });
  });
});
