import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Attendance } from '../modules/attendances/entities/attendance.entity';
import { Department } from '../modules/departments/entities/department.entity';
import { Employee } from '../modules/employees/entities/employee.entity';

// Primary connection: owned by this service, read-write.
export const masterDbConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  name: 'master',
  type: 'mysql',
  host: config.get('DB_HOST'),
  port: config.get('DB_PORT'),
  username: config.get('DB_USERNAME'),
  password: config.get('DB_PASSWORD'),
  database: config.get('DB_MASTER_NAME'),
  entities: [Employee, Department],
  synchronize: true,
});

// Secondary connection: owned by attendance-service, read-only from here.
// synchronize is always false so this service can never alter attendance_db's schema.
export const attendanceDbConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  name: 'attendance',
  type: 'mysql',
  host: config.get('DB_HOST'),
  port: config.get('DB_PORT'),
  username: config.get('DB_USERNAME'),
  password: config.get('DB_PASSWORD'),
  database: config.get('DB_ATTENDANCE_NAME'),
  entities: [Attendance],
  synchronize: false,
});
