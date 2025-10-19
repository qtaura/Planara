import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Task } from "./Task.js";
import { User } from "./User.js";

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Task, (task) => task.comments, { onDelete: "CASCADE" })
  task!: Task | null;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: "SET NULL" })
  author?: User | null;

  @Column()
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}