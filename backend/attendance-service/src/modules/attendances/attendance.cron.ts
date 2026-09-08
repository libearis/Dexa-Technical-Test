import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendancesService } from './attendances.service';

// Runs after midnight to annotate the previous day's rows that never got a check-out,
// since they otherwise stay silently INCOMPLETE with no record of why.
@Injectable()
export class AttendanceCron {
  private readonly logger = new Logger(AttendanceCron.name);

  constructor(private readonly attendancesService: AttendancesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleEndOfDay() {
    const affected = await this.attendancesService.markIncompleteBeforeToday();
    this.logger.log(`End-of-day job marked ${affected} attendance record(s) as incomplete`);
  }
}
