import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Column,
  Unique,
} from 'typeorm';
import { User } from './User.js';
import { Team } from './Team.js';
import { Organization } from './Organization.js';

@Entity()
@Unique(['user', 'team'])
export class Membership {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  org!: Organization;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  team!: Team;

  // Role levels: owner, admin, member, viewer
  @Column({ default: 'member' })
  role!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
