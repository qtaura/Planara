import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './User.js';
import { Project } from './Project.js';
import { Task } from './Task.js';
import { NotificationPreference } from './NotificationPreference.js';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column()
  message!: string;

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
  @Index()
  type!: string;

  @Column({ default: false })
  @Index()
  read!: boolean;

  @Column({ nullable: true })
  readAt?: Date;

  @Column({ type: 'varchar', enum: ['in_app', 'email', 'push'], default: 'in_app' })
  @Index()
  channel!: 'in_app' | 'email' | 'push';

  @CreateDateColumn()
  createdAt!: Date;

  // Avoid design:type circular reference; TypeORM uses lambda target
  @ManyToOne(() => User, (user) => user.notifications)
  @Index()
  user!: any;

  @ManyToOne(() => Project, { nullable: true })
  @Index()
  project?: Project;

  @ManyToOne(() => Task, { nullable: true })
  @Index()
  task?: Task;

  @Column({ nullable: true })
  actionUrl?: string;

  @ManyToOne(() => NotificationPreference, { nullable: true })
  preference?: NotificationPreference | null;
}