import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type EmployeeRole = 'EMPLOYEE' | 'HRD_ADMIN';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

// master_db.employees, owned and written here. attendance-service only ever reads this
// table through its own read-only mirror entity.
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Login credential — distinct from `name`, which is just for display (e.g. "Welcome, X").
  @Column({ unique: true })
  username: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: ['EMPLOYEE', 'HRD_ADMIN'] })
  role: EmployeeRole;

  @Column({ name: 'department_id', nullable: true })
  departmentId: number | null;

  @Column()
  position: string;

  @Column({ name: 'join_date', type: 'date' })
  joinDate: string;

  @Column({ type: 'enum', enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status: EmployeeStatus;

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
