import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AttendancesService } from './attendances.service';

@Controller('attendances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Post('check-in')
  @Roles('EMPLOYEE')
  @UseInterceptors(FileInterceptor('photo'))
  checkIn(@CurrentUser() user: CurrentUserPayload, @UploadedFile() photo: Express.Multer.File) {
    return this.attendancesService.checkIn(user.employeeId, photo);
  }

  @Post('check-out')
  @Roles('EMPLOYEE')
  @UseInterceptors(FileInterceptor('photo'))
  checkOut(@CurrentUser() user: CurrentUserPayload, @UploadedFile() photo: Express.Multer.File) {
    return this.attendancesService.checkOut(user.employeeId, photo);
  }

  @Get('history')
  @Roles('EMPLOYEE')
  getHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendancesService.getHistory(user.employeeId, { from, to });
  }
}
