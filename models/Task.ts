import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Project } from './Project.js';
import { Milestone } from './Milestone.js';
import { User } from './User.js';
import { Comment } from './Comment.js';
import { Attachment } from './Attachment.js';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Index()
  @Column({ nullable: true })
  titleLower?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'todo' })
  @Index()
  status!: string;

  @Column({ default: 'medium' })
  @Index()
  priority!: string;

  @Column('simple-array', { nullable: true })
  labels?: string[];

  // Let TypeORM infer the proper date/time column type per driver
  @Column({ nullable: true })
  @Index()
  dueDate?: Date;

  @ManyToOne(() => Milestone, { nullable: true, onDelete: 'SET NULL' })
  @Index()
  milestone?: Milestone | null;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  @Index()
  project!: Project | null;

  @ManyToOne(() => User, (user) => user.tasks, { nullable: true, onDelete: 'SET NULL' })
  @Index()
  assignee?: User | null;

  @OneToMany(() => Comment, (comment) => comment.task)
  comments?: Comment[];

  @OneToMany(() => Attachment, (att) => att.task)
  attachments?: Attachment[];

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}
