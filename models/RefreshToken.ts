import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from "typeorm";

@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  userId!: number;

  @Index({ unique: true })
  @Column()
  jti!: string;

  // Cross-database compatible datetime for sqlite/postgres
  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ default: false })
  isRevoked!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  rotatedFromId?: number;

  // Session metadata
  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date | null;

  @Column({ nullable: true })
  replacedById?: number | null;
}