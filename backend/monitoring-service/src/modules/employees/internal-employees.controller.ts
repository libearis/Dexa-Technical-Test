import { Controller, ForbiddenException, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { InternalTokenGuard } from '../../common/guards/internal-token.guard';
import { EmployeesService } from './employees.service';

// Consumed only by attendance-service's EmployeeClientService, e.g. to validate active
// status before allowing check-in — logic that belongs to this service, not a DB read.
@Controller('internal/employees')
@UseGuards(InternalTokenGuard)
export class InternalEmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get(':id')
  async getActiveEmployee(@Param('id', ParseIntPipe) id: number) {
    const employee = await this.employeesService.findOne(id);
    if (employee.status !== 'ACTIVE') {
      throw new ForbiddenException('Karyawan tidak aktif');
    }
    return {
      id: employee.id,
      name: employee.name,
      status: employee.status,
      departmentId: employee.departmentId,
    };
  }
}
