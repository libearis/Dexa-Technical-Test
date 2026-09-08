import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

// Sent alongside the photo on check-in/out — a best-effort audit trail from
// the browser's Geolocation API, not a verified geofence.
export class CheckLocationDto {
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;
}
