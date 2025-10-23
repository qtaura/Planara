import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User.js";
import { Project } from "./Project.js";
import { Task } from "./Task.js";

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column()
  message!: string;

  @Column({ 
    type: "varchar",
    enum: ["task_assigned", "task_completed", "project_updated", "comment_added", "milestone_due", "general"],
    default: "general"
  })
  type!: string;

  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  // Avoid design:type circular reference; TypeORM uses lambda target
  @ManyToOne(() => User, (user) => user.notifications)
  user!: any;

  @ManyToOne(() => Project, { nullable: true })
  project?: Project;

  @ManyToOne(() => Task, { nullable: true })
  task?: Task;

  @Column({ nullable: true })
  actionUrl?: string;
}