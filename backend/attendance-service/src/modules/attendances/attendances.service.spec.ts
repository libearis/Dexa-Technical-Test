import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as exifr from 'exifr';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import { EmployeeClientService } from '../employees/employee-client.service';
import { AttendancesService } from './attendances.service';
import { Attendance } from './entities/attendance.entity';

jest.mock('fs');
jest.mock('exifr');

const mockPhoto = () =>
  ({
    buffer: Buffer.from(''),
    originalname: 'photo.jpg',
  }) as Express.Multer.File;

describe('AttendancesService', () => {
  let service: AttendancesService;
  let attendanceRepository: jest.Mocked<Repository<Attendance>>;
  let employeeClientService: jest.Mocked<EmployeeClientService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendancesService,
        {
          provide: getRepositoryToken(Attendance, 'attendance'),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((x) => x),
            save: jest.fn((x) => Promise.resolve({ id: 1, ...x })),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: EmployeeClientService,
          useValue: {
            getActiveEmployee: jest
              .fn()
              .mockResolvedValue({ id: 1, status: 'ACTIVE' }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) }, // fall back to defaults
        },
      ],
    }).compile();

    service = module.get(AttendancesService);
    attendanceRepository = module.get(
      getRepositoryToken(Attendance, 'attendance'),
    );
    employeeClientService = module.get(EmployeeClientService);
  });

  describe('checkIn', () => {
    it('rejects a second check-in on the same day', async () => {
      attendanceRepository.findOne.mockResolvedValue({ id: 1 } as Attendance);

      await expect(service.checkIn(1, mockPhoto())).rejects.toThrow(
        'Anda sudah melakukan check-in hari ini',
      );
    });

    it('validates the employee is active via monitoring-service first', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);
      (exifr.parse as jest.Mock).mockResolvedValue({
        DateTimeOriginal: new Date(),
      });

      await service.checkIn(7, mockPhoto());

      expect(employeeClientService.getActiveEmployee).toHaveBeenCalledWith(7);
    });

    it('accepts a photo whose EXIF time is within tolerance', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);
      (exifr.parse as jest.Mock).mockResolvedValue({
        DateTimeOriginal: new Date(),
      });

      const result = await service.checkIn(1, mockPhoto());

      expect(result.status).toBe('INCOMPLETE');
      expect(result.notes).toBeNull();
    });

    it('rejects a photo whose EXIF time is outside the tolerance window', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);
      const staleTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago, default tolerance is 10 min
      (exifr.parse as jest.Mock).mockResolvedValue({
        DateTimeOriginal: staleTime,
      });

      await expect(service.checkIn(1, mockPhoto())).rejects.toThrow(
        /tidak sesuai dengan waktu server/,
      );
    });

    it('accepts but flags a photo with no readable EXIF metadata', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);
      (exifr.parse as jest.Mock).mockResolvedValue({});

      const result = await service.checkIn(1, mockPhoto());

      expect(result.notes).toMatch(/EXIF/);
    });

    it('stamps createdBy/updatedBy with the checking-in employee', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);
      (exifr.parse as jest.Mock).mockResolvedValue({
        DateTimeOriginal: new Date(),
      });

      const result = await service.checkIn(9, mockPhoto());

      expect(result.createdBy).toBe(9);
      expect(result.updatedBy).toBe(9);
    });
  });

  describe('checkOut', () => {
    afterEach(() => jest.useRealTimers());

    it('rejects check-out without a prior check-in today', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);

      await expect(service.checkOut(1, mockPhoto())).rejects.toThrow(
        'Anda belum melakukan check-in hari ini',
      );
    });

    it('rejects a second check-out on the same day', async () => {
      attendanceRepository.findOne.mockResolvedValue({
        checkOutTime: new Date(),
      } as Attendance);

      await expect(service.checkOut(1, mockPhoto())).rejects.toThrow(
        'Anda sudah melakukan check-out hari ini',
      );
    });

    it('rejects check-out before 17:00 server time', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00'));
      attendanceRepository.findOne.mockResolvedValue({
        checkOutTime: null,
      } as unknown as Attendance);

      await expect(service.checkOut(1, mockPhoto())).rejects.toThrow(
        'Check-out hanya bisa dilakukan setelah pukul 17:00',
      );
    });

    it('accepts check-out after 17:00 with a valid EXIF photo', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T18:00:00'));
      attendanceRepository.findOne.mockResolvedValue({
        checkOutTime: null,
        notes: null,
      } as unknown as Attendance);
      (exifr.parse as jest.Mock).mockResolvedValue({
        DateTimeOriginal: new Date('2026-01-01T18:00:00'),
      });

      const result = await service.checkOut(3, mockPhoto());

      expect(result.status).toBe('PRESENT');
      expect(result.updatedBy).toBe(3);
    });
  });
});
