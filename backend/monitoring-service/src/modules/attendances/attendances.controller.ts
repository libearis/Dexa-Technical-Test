import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AttendancesService } from './attendances.service';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';

// View-only by design — HRD Admin never edits or deletes attendance from this service.
@Controller('attendances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('HRD_ADMIN')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Get()
  findAll(@Query() filter: AttendanceFilterDto) {
    return this.attendancesService.findAll(filter);
  }

  @Get('dashboard/summary')
  getDashboardSummary() {
    return this.attendancesService.getDashboardSummary();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attendancesService.findOne(id);
  }
}
