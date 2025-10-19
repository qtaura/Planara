import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Task } from "./Task.js";
import { Comment } from "./Comment.js";

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

  @OneToMany(() => Task, (task) => task.assignee)
  tasks?: Task[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments?: Comment[];
}