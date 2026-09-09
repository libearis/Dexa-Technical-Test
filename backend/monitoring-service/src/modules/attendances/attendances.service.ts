import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { Attendance } from './entities/attendance.entity';

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(Attendance, 'attendance')
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee, 'master')
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  // ----- public -----
  async findAll(filter: AttendanceFilterDto) {
    const employeeIds = await this.resolveEmployeeIdsInScope(filter);

    // "Not checked in" is synthesized (there's no row in `attendances` for
    // it), which only makes sense against one specific day — not a range.
    const isSingleDate =
      !!filter.from && !!filter.to && filter.from === filter.to;
    const includeRealRows = filter.status !== 'NOT_CHECKED_IN';
    const includeNotCheckedIn =
      isSingleDate && (!filter.status || filter.status === 'NOT_CHECKED_IN');

    const realRows = includeRealRows
      ? await this.findRealRows(filter, employeeIds)
      : [];
    const notCheckedInRows = includeNotCheckedIn
      ? await this.findNotCheckedInRows(filter.from as string, employeeIds)
      : [];

    return [...realRows, ...notCheckedInRows];
  }

  async findOne(id: number) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
    });
    if (!attendance) {
      throw new NotFoundException('Data absensi tidak ditemukan');
    }
    const employee = await this.employeeRepository.findOne({
      where: { id: attendance.employeeId },
    });
    return {
      ...attendance,
      employee: employee ? this.toEmployeeSummary(employee) : null,
    };
  }

  async getDashboardSummary(date?: string) {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const [activeEmployeeCount, dayAttendances] = await Promise.all([
      this.employeeRepository.count({ where: { status: 'ACTIVE' } }),
      this.attendanceRepository.find({ where: { attendanceDate: targetDate } }),
    ]);

    const presentToday = dayAttendances.filter(
      (a) => a.status === 'PRESENT',
    ).length;
    const incompleteToday = dayAttendances.filter(
      (a) => a.status === 'INCOMPLETE',
    ).length;

    return {
      date: targetDate,
      totalActiveEmployees: activeEmployeeCount,
      presentToday,
      incompleteToday,
      notCheckedInToday: activeEmployeeCount - dayAttendances.length,
    };
  }

  // ----- private -----
  private async findRealRows(
    filter: AttendanceFilterDto,
    employeeIds?: number[],
  ) {
    const where: Record<string, unknown> = {};
    if (filter.from && filter.to)
      where.attendanceDate = Between(filter.from, filter.to);
    if (filter.status && filter.status !== 'NOT_CHECKED_IN')
      where.status = filter.status;
    if (employeeIds) where.employeeId = In(employeeIds);

    const attendances = await this.attendanceRepository.find({
      where,
      order: { attendanceDate: 'DESC' },
    });
    return this.attachEmployeeInfo(attendances);
  }

  private async findNotCheckedInRows(date: string, employeeIds?: number[]) {
    const employeeWhere: Record<string, unknown> = { status: 'ACTIVE' };
    if (employeeIds) employeeWhere.id = In(employeeIds);
    const scopedEmployees = await this.employeeRepository.find({
      where: employeeWhere,
    });
    if (scopedEmployees.length === 0) return [];

    const checkedIn = await this.attendanceRepository.find({
      where: {
        attendanceDate: date,
        employeeId: In(scopedEmployees.map((e) => e.id)),
      },
      select: ['employeeId'],
    });
    const checkedInIds = new Set(checkedIn.map((a) => a.employeeId));

    return scopedEmployees
      .filter((e) => !checkedInIds.has(e.id))
      .map((e) => ({
        id: null,
        employeeId: e.id,
        attendanceDate: date,
        checkInTime: null,
        checkOutTime: null,
        status: 'NOT_CHECKED_IN' as const,
        employee: this.toEmployeeSummary(e),
      }));
  }

  private async resolveEmployeeIdsInScope(
    filter: AttendanceFilterDto,
  ): Promise<number[] | undefined> {
    if (filter.employeeId) return [filter.employeeId];
    if (filter.departmentId) {
      const employees = await this.employeeRepository.find({
        where: { departmentId: filter.departmentId },
        select: ['id'],
      });
      return employees.map((e) => e.id);
    }
    return undefined;
  }

  private async attachEmployeeInfo(attendances: Attendance[]) {
    if (attendances.length === 0) return [];
    const employeeIds = [...new Set(attendances.map((a) => a.employeeId))];
    const employees = await this.employeeRepository.find({
      where: { id: In(employeeIds) },
    });
    const employeeById = new Map(employees.map((e) => [e.id, e]));

    return attendances.map((attendance) => ({
      ...attendance,
      employee: this.toEmployeeSummary(employeeById.get(attendance.employeeId)),
    }));
  }

  private toEmployeeSummary(employee?: Employee) {
    if (!employee) return null;
    return {
      id: employee.id,
      name: employee.name,
      position: employee.position,
      departmentId: employee.departmentId,
    };
  }
}
