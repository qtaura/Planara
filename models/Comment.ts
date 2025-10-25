import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Task } from "./Task.js";
import { User } from "./User.js";
import { Thread } from "./Thread.js";

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

  // Threading support: link to parent comment (if this is a reply)
  @ManyToOne(() => Comment, { nullable: true, onDelete: "CASCADE" })
  parentComment?: Comment | null;

  // Thread association (grouping root and replies)
  @ManyToOne(() => Thread, (thread) => thread.comments, { nullable: true, onDelete: "CASCADE" })
  thread?: Thread | null;

  // Reactions: map from reaction type to counts
  @Column("simple-json", { nullable: true })
  reactions?: Record<string, number> | null;

  // Mentions: list of usernames resolved (case-insensitive via usernameLower)
  @Column("simple-array", { nullable: true })
  mentions?: string[] | null;
}