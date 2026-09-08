import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';

// Reads employee data directly via the read-only "master" connection.
// Reserved for plain lookups (e.g. login) that need no business logic from monitoring-service.
@Injectable()
export class EmployeeLookupService {
  constructor(
    @InjectRepository(Employee, 'master')
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async findByUsername(username: string): Promise<Employee | null> {
    return this.employeeRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<Employee | null> {
    return this.employeeRepository.findOne({ where: { id } });
  }
}
