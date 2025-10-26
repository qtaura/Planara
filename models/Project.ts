import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, ManyToOne, Index } from "typeorm";
import { Task } from "./Task.js";
import { Milestone } from "./Milestone.js";
import { User } from "./User.js";
import { Team } from "./Team.js";
import { Attachment } from "./Attachment.js";

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;

  @Column({ default: false })
  @Index()
  archived!: boolean;

  @Column({ default: false })
  @Index()
  favorite!: boolean;

  @ManyToOne(() => User, (user) => user.projects, { onDelete: "CASCADE" })
  @Index()
  owner!: any;

  @Index()
  @ManyToOne(() => Team, { nullable: true, onDelete: "SET NULL" })
  team?: Team | null;

  @OneToMany(() => Task, (task) => task.project)
  tasks?: Task[];

  @OneToMany(() => Attachment, (att) => att.project)
  attachments?: Attachment[];

  @OneToMany(() => Milestone, (milestone) => milestone.project)
  milestones?: Milestone[];
}