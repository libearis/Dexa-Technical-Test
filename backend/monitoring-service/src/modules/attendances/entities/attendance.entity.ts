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

// Read-only mirror of attendance_db.attendances, owned by attendance-service.
// Registered on the "attendance" (read-only) connection — never write through this entity here.
@Entity('attendances')
@Unique(['employeeId', 'attendanceDate'])
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  @Column({ name: 'check_in_time', type: 'datetime' })
  checkInTime: Date;

  @Column({ name: 'check_in_photo_url' })
  checkInPhotoUrl: string;

  @Column({ name: 'check_in_photo_exif_time', type: 'datetime', nullable: true })
  checkInPhotoExifTime: Date | null;

  @Column({ name: 'check_out_time', type: 'datetime', nullable: true })
  checkOutTime: Date | null;

  @Column({ name: 'check_out_photo_url', nullable: true })
  checkOutPhotoUrl: string | null;

  @Column({ name: 'check_out_photo_exif_time', type: 'datetime', nullable: true })
  checkOutPhotoExifTime: Date | null;

  @Column({ type: 'enum', enum: ['PRESENT', 'INCOMPLETE'], default: 'INCOMPLETE' })
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
