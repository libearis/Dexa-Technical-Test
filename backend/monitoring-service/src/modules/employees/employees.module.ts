import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { InternalEmployeesController } from './internal-employees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee], 'master')],
  controllers: [EmployeesController, InternalEmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
