import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, ManyToOne } from "typeorm";
import { Task } from "./Task.js";
import { Milestone } from "./Milestone.js";
import { User } from "./User.js";

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: false })
  archived!: boolean;

  @Column({ default: false })
  favorite!: boolean;

  @ManyToOne(() => User, (user) => user.projects, { onDelete: "CASCADE" })
  owner!: any;

  @OneToMany(() => Task, (task) => task.project)
  tasks?: Task[];

  @OneToMany(() => Milestone, (milestone) => milestone.project)
  milestones?: Milestone[];
}