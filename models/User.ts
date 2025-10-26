import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { Task } from './Task.js';
import { Comment } from './Comment.js';
import { Project } from './Project.js';
import { Notification } from './Notification.js';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  @Index()
  username!: string;

  @Column({ unique: true })
  @Index()
  email!: string;

  @Column()
  hashedPassword!: string;

  @Column({ nullable: true })
  @Index()
  teamId?: number;

  @Column({ nullable: true })
  avatar?: string;

  // Add case-insensitive username support and change limit tracking
  @Column({ unique: true, nullable: true })
  @Index()
  usernameLower?: string;

  @Column({ default: 0 })
  usernameChangeCount!: number;

  @Column({ default: false })
  @Index()
  isVerified!: boolean;

  // Security & abuse-prevention tracking
  @Column({ default: 0 })
  verifyInvalidCount!: number;

  @Column({ nullable: true })
  verifyLockedUntil?: Date;

  @Column({ nullable: true })
  verifyBackoffUntil?: Date;

  @Column({ nullable: true })
  sendBackoffUntil?: Date;

  @Column({ nullable: true })
  verificationSecret?: string;

  @OneToMany(() => Task, (task) => task.assignee)
  tasks?: Task[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments?: Comment[];

  @OneToMany(() => Project, (project) => project.owner)
  projects?: Project[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications?: Notification[];
}