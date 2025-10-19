import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Project } from "./Project.js";

@Entity()
export class Milestone {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @ManyToOne(() => Project, (project) => project.milestones, { onDelete: "CASCADE" })
  project!: Project;

  @Column({ type: "integer", default: 0 })
  progressPercent!: number;

  @Column({ type: "datetime", nullable: true })
  dueDate?: Date;
}