import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { EmployeeStatus } from './entities/employee.entity';

export interface EmployeeSnapshot {
  id: number;
  name: string;
  status: EmployeeStatus;
  departmentId: number | null;
}

// Wraps HTTP calls to monitoring-service (the owner of employee data) for operations that need
// its business logic, rather than just reading rows through the read-only DB connection.
@Injectable()
export class EmployeeClientService {
  private readonly baseUrl: string;
  private readonly internalToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('MONITORING_SERVICE_URL') ?? '';
    this.internalToken =
      this.configService.get<string>('INTERNAL_SERVICE_TOKEN') ?? '';
  }

  // ----- public -----
  async getActiveEmployee(employeeId: number): Promise<EmployeeSnapshot> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<EmployeeSnapshot>(
          `${this.baseUrl}/internal/employees/${employeeId}`,
          { headers: { 'x-internal-token': this.internalToken } },
        ),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new NotFoundException('Karyawan tidak ditemukan');
      }
      throw new ServiceUnavailableException(
        'Tidak dapat memvalidasi status karyawan ke monitoring-service saat ini',
      );
    }
  }
}
