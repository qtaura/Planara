import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Task } from "./Task.js";
import { Comment } from "./Comment.js";
import { Project } from "./Project.js";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  hashedPassword!: string;

  @Column({ nullable: true })
  teamId?: number;

  @Column({ nullable: true })
  avatar?: string;

  // Add case-insensitive username support and change limit tracking
  @Column({ unique: true, nullable: true })
  usernameLower?: string;

  @Column({ default: 0 })
  usernameChangeCount!: number;

  @OneToMany(() => Task, (task) => task.assignee)
  tasks?: Task[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments?: Comment[];

  @OneToMany(() => Project, (project) => project.owner)
  projects?: Project[];
}