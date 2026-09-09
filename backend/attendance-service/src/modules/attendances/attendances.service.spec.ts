import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as exifr from 'exifr';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import { EmployeeLookupService } from '../employees/employee-lookup.service';
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
  let employeeLookupService: jest.Mocked<EmployeeLookupService>;

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
          provide: EmployeeLookupService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 1, status: 'ACTIVE' }),
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
    employeeLookupService = module.get(EmployeeLookupService);
  });

  describe('checkIn', () => {
    it('rejects a second check-in on the same day', async () => {
      attendanceRepository.findOne.mockResolvedValue({ id: 1 } as Attendance);

      await expect(service.checkIn(1, mockPhoto())).rejects.toThrow(
        'Anda sudah melakukan check-in hari ini',
      );
    });

    it('validates the employee is active via the read-only master connection first', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);
      (exifr.parse as jest.Mock).mockResolvedValue({
        DateTimeOriginal: new Date(),
      });

      await service.checkIn(7, mockPhoto());

      expect(employeeLookupService.findById).toHaveBeenCalledWith(7);
    });

    it('rejects check-in for a deactivated employee', async () => {
      employeeLookupService.findById.mockResolvedValue({
        id: 1,
        status: 'INACTIVE',
      } as any);

      await expect(service.checkIn(1, mockPhoto())).rejects.toThrow(
        'Karyawan tidak aktif',
      );
      expect(attendanceRepository.findOne).not.toHaveBeenCalled();
    });

    it('rejects check-in when the employee cannot be found', async () => {
      employeeLookupService.findById.mockResolvedValue(null);

      await expect(service.checkIn(999, mockPhoto())).rejects.toThrow(
        'Karyawan tidak aktif',
      );
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

    it('stores the reported latitude/longitude when location is provided', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);
      (exifr.parse as jest.Mock).mockResolvedValue({
        DateTimeOriginal: new Date(),
      });

      const result = await service.checkIn(1, mockPhoto(), {
        lat: -6.2088,
        lng: 106.8456,
      });

      expect(result.checkInLat).toBe('-6.2088');
      expect(result.checkInLng).toBe('106.8456');
    });

    it('leaves latitude/longitude null when location is omitted', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);
      (exifr.parse as jest.Mock).mockResolvedValue({
        DateTimeOriginal: new Date(),
      });

      const result = await service.checkIn(1, mockPhoto());

      expect(result.checkInLat).toBeNull();
      expect(result.checkInLng).toBeNull();
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

    it('stores the reported latitude/longitude when location is provided', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T18:00:00'));
      attendanceRepository.findOne.mockResolvedValue({
        checkOutTime: null,
        notes: null,
      } as unknown as Attendance);
      (exifr.parse as jest.Mock).mockResolvedValue({
        DateTimeOriginal: new Date('2026-01-01T18:00:00'),
      });

      const result = await service.checkOut(3, mockPhoto(), {
        lat: -6.2088,
        lng: 106.8456,
      });

      expect(result.checkOutLat).toBe('-6.2088');
      expect(result.checkOutLng).toBe('106.8456');
    });
  });
});
