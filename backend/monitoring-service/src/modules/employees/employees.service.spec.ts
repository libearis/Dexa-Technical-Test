import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeesService } from './employees.service';

jest.mock('bcrypt');

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeeRepository: jest.Mocked<Repository<Employee>>;

  beforeEach(async () => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: getRepositoryToken(Employee, 'master'),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn((x) => x),
            save: jest.fn((x) => Promise.resolve({ id: 1, ...x })),
          },
        },
      ],
    }).compile();

    service = module.get(EmployeesService);
    employeeRepository = module.get(getRepositoryToken(Employee, 'master'));
  });

  describe('create', () => {
    const dto = {
      name: 'A',
      username: 'a',
      email: 'a@example.com',
      password: 'plain-text',
      role: 'EMPLOYEE' as const,
      position: 'Staff',
      joinDate: '2024-01-01',
    };

    it('rejects a duplicate email', async () => {
      employeeRepository.findOne.mockImplementation(({ where }: any) =>
        Promise.resolve(where.email ? ({ id: 99 } as Employee) : null),
      );

      await expect(
        service.create({ ...dto, email: 'dup@example.com' }, null),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a duplicate username', async () => {
      employeeRepository.findOne.mockImplementation(({ where }: any) =>
        Promise.resolve(where.username ? ({ id: 99 } as Employee) : null),
      );

      await expect(
        service.create({ ...dto, username: 'dup' }, null),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes the password and never returns it', async () => {
      employeeRepository.findOne.mockResolvedValue(null);

      const result = await service.create(dto, 42);

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-text', 10);
      expect(result).not.toHaveProperty('password');
    });

    it('stamps createdBy/updatedBy with the acting user', async () => {
      employeeRepository.findOne.mockResolvedValue(null);

      await service.create(dto, 42);

      expect(employeeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 42, updatedBy: 42 }),
      );
    });
  });

  describe('update', () => {
    const existing = {
      id: 5,
      email: 'current@example.com',
      username: 'current',
      password: 'old-hash',
    } as Employee;

    it('allows keeping the same email/username on the same employee', async () => {
      employeeRepository.findOne.mockResolvedValue({ ...existing });

      await expect(
        service.update(5, { email: 'current@example.com' }, 1),
      ).resolves.toBeDefined();
    });

    it('rejects an email already used by a different employee', async () => {
      employeeRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id) return Promise.resolve({ ...existing });
        if (where.email) return Promise.resolve({ id: 999 } as Employee);
        return Promise.resolve(null);
      });

      await expect(
        service.update(5, { email: 'taken@example.com' }, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('rehashes the password only when a new one is provided', async () => {
      employeeRepository.findOne.mockResolvedValue({ ...existing });

      await service.update(5, {}, 1);
      expect(bcrypt.hash).not.toHaveBeenCalled();

      await service.update(5, { password: 'new-secret' }, 1);
      expect(bcrypt.hash).toHaveBeenCalledWith('new-secret', 10);
    });

    it('throws if the employee does not exist', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      await expect(service.update(404, {}, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('sets status to INACTIVE and stamps updatedBy', async () => {
      employeeRepository.findOne.mockResolvedValue({
        id: 5,
        status: 'ACTIVE',
      } as Employee);

      await service.deactivate(5, 7);

      expect(employeeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'INACTIVE', updatedBy: 7 }),
      );
    });
  });
});
