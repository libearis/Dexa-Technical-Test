import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentsService } from './departments.service';
import { Department } from './entities/department.entity';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let departmentRepository: jest.Mocked<Repository<Department>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        {
          provide: getRepositoryToken(Department, 'master'),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((x) => x),
            save: jest.fn((x) => Promise.resolve({ id: 1, ...x })),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get(DepartmentsService);
    departmentRepository = module.get(getRepositoryToken(Department, 'master'));
  });

  describe('remove', () => {
    it('throws if the department does not exist', async () => {
      departmentRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(404, 1)).rejects.toThrow(NotFoundException);
      expect(departmentRepository.update).not.toHaveBeenCalled();
    });

    it('soft-deletes by setting deletedAt/deletedBy via update(), not softRemove()', async () => {
      departmentRepository.findOne.mockResolvedValue({
        id: 3,
        name: 'Temp',
      } as Department);

      await service.remove(3, 7);

      expect(departmentRepository.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ deletedAt: expect.any(Date), deletedBy: 7 }),
      );
    });
  });

  describe('update', () => {
    it('stamps updatedBy with the acting user', async () => {
      departmentRepository.findOne.mockResolvedValue({
        id: 3,
        name: 'Engineering',
      } as Department);

      await service.update(3, { name: 'Engineering Team' }, 9);

      expect(departmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Engineering Team', updatedBy: 9 }),
      );
    });
  });

  describe('create', () => {
    it('stamps createdBy/updatedBy with the acting user', async () => {
      await service.create({ name: 'HRD' }, 9);

      expect(departmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 9, updatedBy: 9 }),
      );
    });
  });
});
