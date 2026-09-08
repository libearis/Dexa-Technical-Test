import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { attendanceDbConfig, masterDbConfig } from './config/database.config';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      name: 'attendance',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: attendanceDbConfig,
    }),
    TypeOrmModule.forRootAsync({
      name: 'master',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: masterDbConfig,
    }),
    AuthModule,
    EmployeesModule,
    AttendancesModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
