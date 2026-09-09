import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeLookupService } from './employee-lookup.service';
import { Employee } from './entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee], 'master')],
  providers: [EmployeeLookupService],
  exports: [EmployeeLookupService],
})
export class EmployeesModule {}
