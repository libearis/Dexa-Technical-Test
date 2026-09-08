import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmployeeLookupService } from '../employees/employee-lookup.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly employeeLookupService: EmployeeLookupService,
    private readonly jwtService: JwtService,
  ) {}

  // ----- public -----
  async login(dto: LoginDto) {
    const employee = await this.employeeLookupService.findByUsername(
      dto.username,
    );
    if (!employee) {
      throw new UnauthorizedException('Username atau password salah');
    }
    if (employee.status === 'INACTIVE') {
      throw new UnauthorizedException('Akun karyawan tidak aktif');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      employee.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const accessToken = this.signToken(
      employee.id,
      employee.username,
      employee.role,
    );
    return {
      accessToken,
      user: {
        id: employee.id,
        name: employee.name,
        username: employee.username,
        role: employee.role,
      },
    };
  }

  // ----- private -----
  private signToken(id: number, username: string, role: string): string {
    return this.jwtService.sign({ sub: id, username, role });
  }
}
