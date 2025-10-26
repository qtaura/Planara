import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Project } from './Project.js';

@Entity()
export class Milestone {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @ManyToOne(() => Project, (project) => project.milestones, { onDelete: 'CASCADE' })
  project!: Project | null;

  @Column({ type: 'integer', default: 0 })
  progressPercent!: number;

  // Use portable Date mapping; driver chooses proper column type (sqlite: datetime, postgres: timestamp)
  @Column({ nullable: true })
  dueDate?: Date;
}
