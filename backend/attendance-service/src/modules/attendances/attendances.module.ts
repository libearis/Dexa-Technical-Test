import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { AttendanceCron } from './attendance.cron';
import { AttendancesController } from './attendances.controller';
import { AttendancesService } from './attendances.service';
import { Attendance } from './entities/attendance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance], 'attendance'), EmployeesModule],
  controllers: [AttendancesController],
  providers: [AttendancesService, AttendanceCron],
})
export class AttendancesModule {}
