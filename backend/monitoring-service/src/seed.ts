import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DepartmentsService } from './modules/departments/departments.service';
import { EmployeesService } from './modules/employees/employees.service';

// One-off dev seed: creates two departments plus one HRD Admin and one Employee login
// so the app can be exercised end-to-end without manual SQL. Run with `npm run seed`.
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const departmentsService = app.get(DepartmentsService);
  const employeesService = app.get(EmployeesService);

  const hrdDepartment = await departmentsService.create({ name: 'HRD' }, null);
  const engineeringDepartment = await departmentsService.create(
    { name: 'Engineering' },
    null,
  );

  await employeesService.create(
    {
      name: 'HRD Admin',
      username: 'hrd.admin',
      email: 'hrd.admin@example.com',
      password: 'password123',
      role: 'HRD_ADMIN',
      departmentId: hrdDepartment.id,
      position: 'HRD Administrator',
      joinDate: '2024-01-01',
    },
    null,
  );

  await employeesService.create(
    {
      name: 'John Employee',
      username: 'john.employee',
      email: 'john.employee@example.com',
      password: 'password123',
      role: 'EMPLOYEE',
      departmentId: engineeringDepartment.id,
      position: 'Software Engineer',
      joinDate: '2024-01-01',
    },
    null,
  );

  console.log('Seed complete:');
  console.log('  HRD Admin login: hrd.admin / password123');
  console.log('  Employee login:  john.employee / password123');

  await app.close();
}

seed().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
