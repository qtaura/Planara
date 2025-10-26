import {
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  OneToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Task } from './Task.js';
import { Comment } from './Comment.js';

@Entity()
export class Thread {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Task, (task) => task.comments, { onDelete: 'CASCADE' })
  task!: Task | null;

  // Optional link to the root comment of the thread
  @OneToOne(() => Comment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
  rootComment?: Comment | null;

  @OneToMany(() => Comment, (comment) => comment.thread)
  comments?: Comment[];

  @CreateDateColumn()
  createdAt!: Date;
}
