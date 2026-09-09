import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as exifr from 'exifr';
import * as fs from 'fs';
import * as path from 'path';
import { Between, Repository } from 'typeorm';
import { EmployeeLookupService } from '../employees/employee-lookup.service';
import { CheckLocationDto } from './dto/check-location.dto';
import { Attendance } from './entities/attendance.entity';

interface AttendanceHistoryFilter {
  from?: string;
  to?: string;
}

@Injectable()
export class AttendancesService {
  private readonly uploadDir: string;
  private readonly exifToleranceMinutes: number;

  constructor(
    @InjectRepository(Attendance, 'attendance')
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly employeeLookupService: EmployeeLookupService,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') ?? 'uploads';
    this.exifToleranceMinutes = Number(
      this.configService.get('EXIF_TOLERANCE_MINUTES') ?? 10,
    );
    fs.mkdirSync(path.join(this.uploadDir, 'check-in'), { recursive: true });
    fs.mkdirSync(path.join(this.uploadDir, 'check-out'), { recursive: true });
  }

  // ----- public -----
  async checkIn(
    employeeId: number,
    photo: Express.Multer.File,
    location?: CheckLocationDto,
  ) {
    await this.assertEmployeeActive(employeeId);

    const now = new Date();
    const attendanceDate = this.toDateOnly(now);

    const existing = await this.attendanceRepository.findOne({
      where: { employeeId, attendanceDate },
    });
    if (existing) {
      throw new BadRequestException('Anda sudah melakukan check-in hari ini');
    }

    const { exifTime, notes } = await this.validateExifTimestamp(photo, now);
    const photoUrl = this.savePhoto(photo, 'check-in');

    const attendance = this.attendanceRepository.create({
      employeeId,
      attendanceDate,
      checkInTime: now,
      checkInPhotoUrl: photoUrl,
      checkInPhotoExifTime: exifTime,
      checkInLat: location?.lat != null ? String(location.lat) : null,
      checkInLng: location?.lng != null ? String(location.lng) : null,
      status: 'INCOMPLETE',
      notes,
      createdBy: employeeId,
      updatedBy: employeeId,
    });
    return this.attendanceRepository.save(attendance);
  }

  async checkOut(
    employeeId: number,
    photo: Express.Multer.File,
    location?: CheckLocationDto,
  ) {
    const now = new Date();
    const attendanceDate = this.toDateOnly(now);

    const attendance = await this.attendanceRepository.findOne({
      where: { employeeId, attendanceDate },
    });
    if (!attendance) {
      throw new BadRequestException('Anda belum melakukan check-in hari ini');
    }
    if (attendance.checkOutTime) {
      throw new BadRequestException('Anda sudah melakukan check-out hari ini');
    }
    if (!this.isAfterClosingHour(now)) {
      throw new BadRequestException(
        'Check-out hanya bisa dilakukan setelah pukul 17:00',
      );
    }

    const { exifTime, notes } = await this.validateExifTimestamp(photo, now);
    const photoUrl = this.savePhoto(photo, 'check-out');

    attendance.checkOutTime = now;
    attendance.checkOutPhotoUrl = photoUrl;
    attendance.checkOutPhotoExifTime = exifTime;
    attendance.checkOutLat =
      location?.lat != null ? String(location.lat) : null;
    attendance.checkOutLng =
      location?.lng != null ? String(location.lng) : null;
    attendance.status = 'PRESENT';
    attendance.notes = notes ?? attendance.notes;
    attendance.updatedBy = employeeId;

    return this.attendanceRepository.save(attendance);
  }

  async getHistory(employeeId: number, filter: AttendanceHistoryFilter) {
    const where: Record<string, unknown> = { employeeId };
    if (filter.from && filter.to) {
      where.attendanceDate = Between(filter.from, filter.to);
    }
    return this.attendanceRepository.find({
      where,
      order: { attendanceDate: 'DESC' },
    });
  }

  async markIncompleteBeforeToday(): Promise<number> {
    const todayStart = this.toDateOnly(new Date());
    const result = await this.attendanceRepository
      .createQueryBuilder()
      .update(Attendance)
      .set({
        notes: () =>
          "COALESCE(notes, 'Check-out tidak dilakukan sebelum tengah malam')",
      })
      .where('attendance_date < :today', { today: todayStart })
      .andWhere('check_out_time IS NULL')
      .andWhere('status = :status', { status: 'INCOMPLETE' })
      .execute();
    return result.affected ?? 0;
  }

  // ----- private -----
  // Read directly via the read-only "master" connection rather than calling monitoring-service's
  // API: this is just a status check, not a decision that needs monitoring-service's business
  // logic, so a live DB read keeps check-in working even if monitoring-service's process is down.
  private async assertEmployeeActive(employeeId: number): Promise<void> {
    const employee = await this.employeeLookupService.findById(employeeId);
    if (!employee || employee.status !== 'ACTIVE') {
      throw new ForbiddenException('Karyawan tidak aktif');
    }
  }

  private async validateExifTimestamp(
    photo: Express.Multer.File,
    serverTime: Date,
  ): Promise<{ exifTime: Date | null; notes: string | null }> {
    let exifTime: Date | null = null;
    try {
      const data = await exifr.parse(photo.buffer, ['DateTimeOriginal']);
      exifTime = data?.DateTimeOriginal
        ? this.toJakartaInstant(data.DateTimeOriginal)
        : null;
    } catch {
      exifTime = null;
    }

    if (!exifTime) {
      return {
        exifTime: null,
        notes:
          'Foto tidak memiliki metadata EXIF — disarankan untuk ditinjau lebih lanjut oleh HRD',
      };
    }

    const diffMinutes =
      Math.abs(serverTime.getTime() - exifTime.getTime()) / 60000;
    if (diffMinutes > this.exifToleranceMinutes) {
      throw new BadRequestException(
        `Waktu foto (${this.formatJakartaTime(exifTime)} WIB) berbeda ${Math.round(diffMinutes)} menit dari waktu server (${this.formatJakartaTime(serverTime)} WIB) — melebihi toleransi ${this.exifToleranceMinutes} menit, silakan foto ulang`,
      );
    }

    return { exifTime, notes: null };
  }

  // EXIF's DateTimeOriginal has no timezone marker, so `exifr` falls back to
  // interpreting it using whatever local timezone the server process happens
  // to run in — correct here (this dev machine resolves to Asia/Jakarta), but
  // it would silently be wrong by a full UTC offset on a server configured for
  // e.g. UTC. Employees are always in WIB, so re-anchor to a fixed +7 offset
  // instead of trusting the OS's ambient timezone.
  private toJakartaInstant(exifLocalDate: Date): Date {
    return new Date(
      Date.UTC(
        exifLocalDate.getFullYear(),
        exifLocalDate.getMonth(),
        exifLocalDate.getDate(),
        exifLocalDate.getHours() - 7,
        exifLocalDate.getMinutes(),
        exifLocalDate.getSeconds(),
      ),
    );
  }

  private formatJakartaTime(date: Date): string {
    return date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  }

  private isAfterClosingHour(date: Date): boolean {
    return date.getHours() >= 17;
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private savePhoto(
    photo: Express.Multer.File,
    subdir: 'check-in' | 'check-out',
  ): string {
    if (!photo) {
      throw new BadRequestException('Foto wajib diunggah');
    }
    const extension = path.extname(photo.originalname) || '.jpg';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    const filePath = path.join(this.uploadDir, subdir, filename);
    fs.writeFileSync(filePath, photo.buffer);
    return `/uploads/${subdir}/${filename}`;
  }
}
