import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { InternalEmployeesController } from './internal-employees.controller';

describe('InternalEmployeesController', () => {
  let controller: InternalEmployeesController;
  let employeesService: jest.Mocked<EmployeesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalEmployeesController],
      providers: [
        { provide: EmployeesService, useValue: { findOne: jest.fn() } },
        // Pulled in transitively by @UseGuards(InternalTokenGuard) on the controller.
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get(InternalEmployeesController);
    employeesService = module.get(EmployeesService);
  });

  it('returns a snapshot for an active employee', async () => {
    employeesService.findOne.mockResolvedValue({
      id: 1,
      name: 'Bob',
      status: 'ACTIVE',
      departmentId: 2,
    } as any);

    const result = await controller.getActiveEmployee(1);

    expect(result).toEqual({
      id: 1,
      name: 'Bob',
      status: 'ACTIVE',
      departmentId: 2,
    });
  });

  it('rejects an inactive employee, used by check-in validation upstream', async () => {
    employeesService.findOne.mockResolvedValue({
      id: 1,
      status: 'INACTIVE',
    } as any);

    await expect(controller.getActiveEmployee(1)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
