import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity()
export class SecurityEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  userId!: number | null;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  eventType!: string; // 'code_sent' | 'verify_failed' | 'backoff' | 'lockout' | 'unlock' | 'verify_success'

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @Column({ type: 'json', nullable: true })
  metadata!: any | null;

  @CreateDateColumn()
  createdAt!: Date;
}
