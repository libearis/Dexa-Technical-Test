import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department, 'master')
    private readonly departmentRepository: Repository<Department>,
  ) {}

  // ----- public -----
  create(dto: CreateDepartmentDto, actorId: number | null) {
    const department = this.departmentRepository.create({
      ...dto,
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.departmentRepository.save(department);
  }

  findAll() {
    return this.departmentRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }
    return department;
  }

  async update(id: number, dto: UpdateDepartmentDto, actorId: number | null) {
    const department = await this.findOne(id);
    Object.assign(department, dto);
    department.updatedBy = actorId;
    return this.departmentRepository.save(department);
  }

  // No hard delete — keeps the audit trail (deleted_at/deleted_by) intact.
  // A plain update() (rather than softRemove(), which only ever touches deletedAt) is used so
  // deletedBy is actually persisted alongside it.
  async remove(id: number, actorId: number | null): Promise<void> {
    await this.findOne(id);
    await this.departmentRepository.update(id, {
      deletedAt: new Date(),
      deletedBy: actorId,
    });
  }
}
