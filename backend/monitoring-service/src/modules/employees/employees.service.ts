import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';

interface EmployeeListFilter {
  departmentId?: number;
  status?: string;
}

type PublicEmployee = Omit<Employee, 'password'>;

const SALT_ROUNDS = 10;

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee, 'master')
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  // ----- public -----
  async create(
    dto: CreateEmployeeDto,
    actorId: number | null,
  ): Promise<PublicEmployee> {
    await this.assertEmailAndUsernameAvailable(dto.email, dto.username);

    const employee = this.employeeRepository.create({
      ...dto,
      departmentId: dto.departmentId ?? null,
      password: await bcrypt.hash(dto.password, SALT_ROUNDS),
      status: 'ACTIVE',
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.sanitize(await this.employeeRepository.save(employee));
  }

  async findAll(filter: EmployeeListFilter): Promise<PublicEmployee[]> {
    const where: Record<string, unknown> = {};
    if (filter.departmentId) where.departmentId = filter.departmentId;
    if (filter.status) where.status = filter.status;
    const employees = await this.employeeRepository.find({
      where,
      order: { name: 'ASC' },
    });
    return employees.map((employee) => this.sanitize(employee));
  }

  async findOne(id: number): Promise<PublicEmployee> {
    return this.sanitize(await this.findOneWithPassword(id));
  }

  async update(
    id: number,
    dto: UpdateEmployeeDto,
    actorId: number | null,
  ): Promise<PublicEmployee> {
    const employee = await this.findOneWithPassword(id);
    await this.assertEmailAndUsernameAvailable(dto.email, dto.username, id);

    const { password, ...rest } = dto;
    Object.assign(employee, rest);
    if (password) {
      employee.password = await bcrypt.hash(password, SALT_ROUNDS);
    }
    employee.updatedBy = actorId;
    return this.sanitize(await this.employeeRepository.save(employee));
  }

  async deactivate(
    id: number,
    actorId: number | null,
  ): Promise<PublicEmployee> {
    const employee = await this.findOneWithPassword(id);
    employee.status = 'INACTIVE';
    employee.updatedBy = actorId;
    return this.sanitize(await this.employeeRepository.save(employee));
  }

  // ----- private -----
  private async findOneWithPassword(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }
    return employee;
  }

  private async assertEmailAndUsernameAvailable(
    email?: string,
    username?: string,
    excludeId?: number,
  ): Promise<void> {
    if (email) {
      const existing = await this.employeeRepository.findOne({
        where: { email },
      });
      if (existing && existing.id !== excludeId) {
        throw new ConflictException('Email sudah terdaftar');
      }
    }
    if (username) {
      const existing = await this.employeeRepository.findOne({
        where: { username },
      });
      if (existing && existing.id !== excludeId) {
        throw new ConflictException('Username sudah terdaftar');
      }
    }
  }

  private sanitize(employee: Employee): PublicEmployee {
    const rest: Partial<Employee> = { ...employee };
    delete rest.password;
    return rest as PublicEmployee;
  }
}
