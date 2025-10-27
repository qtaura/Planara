import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Team } from './Team.js';
import { Project } from './Project.js';

export type RetentionScope = 'global' | 'team' | 'project';

@Entity()
export class RetentionPolicy {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 16 })
  scope!: RetentionScope; // global | team | project

  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @Index('IDX_retention_team_id')
  team?: Team | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @Index('IDX_retention_project_id')
  project?: Project | null;

  @Column({ type: 'int', nullable: true })
  maxVersions?: number | null; // keep at most N latest versions (>=1 ensures at least latest)

  @Column({ type: 'int', nullable: true })
  keepDays?: number | null; // purge versions older than N days (always keep latest)

  @CreateDateColumn()
  createdAt!: Date;
}
