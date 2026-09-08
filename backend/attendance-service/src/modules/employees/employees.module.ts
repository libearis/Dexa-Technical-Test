import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeClientService } from './employee-client.service';
import { EmployeeLookupService } from './employee-lookup.service';
import { Employee } from './entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee], 'master'), HttpModule],
  providers: [EmployeeLookupService, EmployeeClientService],
  exports: [EmployeeLookupService, EmployeeClientService],
})
export class EmployeesModule {}
