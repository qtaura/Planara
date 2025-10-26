import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Task } from './Task.js';
import { User } from './User.js';

@Entity('external_links')
@Index(['taskId', 'provider'], { unique: true }) // One link per provider per task
export class ExternalLink {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  taskId!: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task;

  @Column({ length: 50 })
  provider!: string; // 'github', 'jira', 'linear', etc.

  @Column({ length: 255 })
  externalId!: string; // Issue number, ticket key, etc.

  @Column({ type: 'text' })
  url!: string; // Full URL to the external resource

  @Column({ length: 100, nullable: true })
  status?: string; // External status (open, closed, in-progress, etc.)

  @Column({ type: 'text', nullable: true })
  title?: string; // External title/summary

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // Additional provider-specific data

  @Column()
  createdBy!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  lastSyncAt?: Date; // When status was last synced from external provider
}
