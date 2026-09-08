import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Protects endpoints meant only for service-to-service calls (e.g. from attendance-service),
// which carry no user JWT of their own.
@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-internal-token'];
    if (
      !token ||
      token !== this.configService.get<string>('INTERNAL_SERVICE_TOKEN')
    ) {
      throw new UnauthorizedException('Token internal tidak valid');
    }
    return true;
  }
}
