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

    const where: Record<string, unknown> = {};
    if (filter.from && filter.to) where.attendanceDate = Between(filter.from, filter.to);
    if (filter.status) where.status = filter.status;
    if (employeeIds) where.employeeId = In(employeeIds);

    const attendances = await this.attendanceRepository.find({
      where,
      order: { attendanceDate: 'DESC' },
    });
    return this.attachEmployeeInfo(attendances);
  }

  async findOne(id: number) {
    const attendance = await this.attendanceRepository.findOne({ where: { id } });
    if (!attendance) {
      throw new NotFoundException('Data absensi tidak ditemukan');
    }
    const employee = await this.employeeRepository.findOne({ where: { id: attendance.employeeId } });
    return { ...attendance, employee: employee ? this.toEmployeeSummary(employee) : null };
  }

  async getDashboardSummary() {
    const today = new Date().toISOString().slice(0, 10);
    const [activeEmployeeCount, todayAttendances] = await Promise.all([
      this.employeeRepository.count({ where: { status: 'ACTIVE' } }),
      this.attendanceRepository.find({ where: { attendanceDate: today } }),
    ]);

    const presentToday = todayAttendances.filter((a) => a.status === 'PRESENT').length;
    const incompleteToday = todayAttendances.filter((a) => a.status === 'INCOMPLETE').length;

    return {
      date: today,
      totalActiveEmployees: activeEmployeeCount,
      presentToday,
      incompleteToday,
      notCheckedInToday: activeEmployeeCount - todayAttendances.length,
    };
  }

  // ----- private -----
  private async resolveEmployeeIdsInScope(filter: AttendanceFilterDto): Promise<number[] | undefined> {
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
    const employees = await this.employeeRepository.find({ where: { id: In(employeeIds) } });
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
