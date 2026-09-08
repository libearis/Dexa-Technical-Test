import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type AttendanceStatus = 'PRESENT' | 'INCOMPLETE';

@Entity('attendances')
@Unique(['employeeId', 'attendanceDate'])
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  // Logical FK to master_db.employees.id — no real DB constraint since it's cross-database.
  @Column({ name: 'employee_id' })
  employeeId: number;

  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  @Column({ name: 'check_in_time', type: 'datetime' })
  checkInTime: Date;

  @Column({ name: 'check_in_photo_url' })
  checkInPhotoUrl: string;

  @Column({
    name: 'check_in_photo_exif_time',
    type: 'datetime',
    nullable: true,
  })
  checkInPhotoExifTime: Date | null;

  // Browser-reported GPS coordinates at the moment of check-in/out — an audit
  // trail, not a geofence. DECIMAL keeps ~1cm precision without float drift.
  @Column({
    name: 'check_in_lat',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  checkInLat: string | null;

  @Column({
    name: 'check_in_lng',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  checkInLng: string | null;

  @Column({ name: 'check_out_time', type: 'datetime', nullable: true })
  checkOutTime: Date | null;

  @Column({ name: 'check_out_photo_url', nullable: true })
  checkOutPhotoUrl: string | null;

  @Column({
    name: 'check_out_photo_exif_time',
    type: 'datetime',
    nullable: true,
  })
  checkOutPhotoExifTime: Date | null;

  @Column({
    name: 'check_out_lat',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  checkOutLat: string | null;

  @Column({
    name: 'check_out_lng',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  checkOutLng: string | null;

  @Column({
    type: 'enum',
    enum: ['PRESENT', 'INCOMPLETE'],
    default: 'INCOMPLETE',
  })
  status: AttendanceStatus;

  @Column({ nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy: number | null;
}
