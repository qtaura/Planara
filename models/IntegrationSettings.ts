import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.js';

@Entity('integration_settings')
@Index(['userId', 'provider'], { unique: true })
export class IntegrationSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ length: 50 })
  provider!: string; // 'github', 'jira', 'slack', 'calendar', etc.

  @Column({ type: 'json', nullable: true })
  config!: Record<string, any>; // Provider-specific configuration

  @Column({ type: 'json', nullable: true })
  credentials!: Record<string, any>; // Encrypted tokens, API keys, etc.

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: 'json', nullable: true })
  preferences!: Record<string, any>; // User preferences for this integration

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
