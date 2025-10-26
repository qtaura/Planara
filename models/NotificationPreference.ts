import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { User } from './User.js';

export type NotificationChannel = 'in_app' | 'email' | 'push';
export type NotificationFrequency = 'instant' | 'daily' | 'weekly';

@Entity()
@Unique(['user', 'type', 'channel']) // prevent conflicting duplicates
export class NotificationPreference {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.id)
  user!: any;

  @Column({
    type: 'varchar',
    enum: [
      'task_assigned',
      'task_completed',
      'project_updated',
      'comment_added',
      'milestone_due',
      'general',
      'team_invite',
    ],
    default: 'general',
  })
  type!: string;

  @Column({ type: 'varchar', enum: ['in_app', 'email', 'push'], default: 'in_app' })
  channel!: NotificationChannel;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'varchar', enum: ['instant', 'daily', 'weekly'], default: 'instant' })
  frequency!: NotificationFrequency;
}