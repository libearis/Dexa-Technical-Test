import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { AttendancesService } from './attendances.service';
import { Attendance } from './entities/attendance.entity';

describe('AttendancesService', () => {
  let service: AttendancesService;
  let attendanceRepository: jest.Mocked<Repository<Attendance>>;
  let employeeRepository: jest.Mocked<Repository<Employee>>;

  const activeEmployees = [
    { id: 1, name: 'Alice', status: 'ACTIVE', departmentId: 10 },
    { id: 2, name: 'Bob', status: 'ACTIVE', departmentId: 10 },
  ] as Employee[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendancesService,
        {
          provide: getRepositoryToken(Attendance, 'attendance'),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Employee, 'master'),
          useValue: { find: jest.fn(), count: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AttendancesService);
    attendanceRepository = module.get(
      getRepositoryToken(Attendance, 'attendance'),
    );
    employeeRepository = module.get(getRepositoryToken(Employee, 'master'));
  });

  describe('findAll', () => {
    it('adds a NOT_CHECKED_IN row for active employees with no record on a single-date query', async () => {
      // The "checkedIn" lookup inside findNotCheckedInRows is the only call
      // that passes `select` — use that to tell it apart from the real-rows query.
      attendanceRepository.find.mockImplementation((options: any) => {
        if (options.select)
          return Promise.resolve([{ employeeId: 1 }] as Attendance[]);
        return Promise.resolve([
          { id: 5, employeeId: 1, status: 'PRESENT' },
        ] as Attendance[]);
      });
      employeeRepository.find.mockResolvedValue(activeEmployees);

      const result: any[] = await service.findAll({
        from: '2026-03-05',
        to: '2026-03-05',
      } as any);

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.employeeId === 1)?.status).toBe('PRESENT');
      const bobRow = result.find((r) => r.employeeId === 2);
      expect(bobRow.status).toBe('NOT_CHECKED_IN');
      expect(bobRow.id).toBeNull();
    });

    it('does not synthesize NOT_CHECKED_IN rows for a multi-day range', async () => {
      attendanceRepository.find.mockResolvedValue([]);

      const result = await service.findAll({
        from: '2026-03-01',
        to: '2026-03-05',
      } as any);

      expect(result).toEqual([]);
      expect(employeeRepository.find).not.toHaveBeenCalled();
    });

    it('returns only synthetic rows when status=NOT_CHECKED_IN is requested', async () => {
      attendanceRepository.find.mockResolvedValue([]);
      employeeRepository.find.mockResolvedValue(activeEmployees);

      const result: any[] = await service.findAll({
        from: '2026-03-05',
        to: '2026-03-05',
        status: 'NOT_CHECKED_IN',
      } as any);

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.status === 'NOT_CHECKED_IN')).toBe(true);
    });

    it('scopes NOT_CHECKED_IN synthesis to the filtered department', async () => {
      attendanceRepository.find.mockResolvedValue([]);
      employeeRepository.find.mockImplementation(({ where }: any) => {
        if (where.departmentId || where.id)
          return Promise.resolve([activeEmployees[0]]);
        return Promise.resolve(activeEmployees);
      });

      const result: any[] = await service.findAll({
        from: '2026-03-05',
        to: '2026-03-05',
        departmentId: 10,
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe(1);
    });
  });
});
