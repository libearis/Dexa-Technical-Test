import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AttendancesService } from './attendances.service';
import { CheckLocationDto } from './dto/check-location.dto';

@Controller('attendances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Post('check-in')
  @Roles('EMPLOYEE', 'HRD_ADMIN')
  @UseInterceptors(FileInterceptor('photo'))
  checkIn(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() photo: Express.Multer.File,
    @Body() location: CheckLocationDto,
  ) {
    return this.attendancesService.checkIn(user.employeeId, photo, location);
  }

  @Post('check-out')
  @Roles('EMPLOYEE', 'HRD_ADMIN')
  @UseInterceptors(FileInterceptor('photo'))
  checkOut(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() photo: Express.Multer.File,
    @Body() location: CheckLocationDto,
  ) {
    return this.attendancesService.checkOut(user.employeeId, photo, location);
  }

  @Get('history')
  @Roles('EMPLOYEE', 'HRD_ADMIN')
  getHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendancesService.getHistory(user.employeeId, { from, to });
  }
}
