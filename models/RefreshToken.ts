import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

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
  @Column()
  expiresAt!: Date;

  @Column({ default: false })
  isRevoked!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'int', nullable: true })
  rotatedFromId?: number | null;

  // Session metadata
  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @Column({ nullable: true })
  revokedAt?: Date;

  @Column({ type: 'int', nullable: true })
  replacedById?: number | null;
}
