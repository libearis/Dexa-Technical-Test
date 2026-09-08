import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { EmployeeRole } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // Login credential — kept separate from `name`, which is just for display.
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(['EMPLOYEE', 'HRD_ADMIN'])
  role: EmployeeRole;

  @IsInt()
  departmentId: number;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsDateString()
  joinDate: string;
}
