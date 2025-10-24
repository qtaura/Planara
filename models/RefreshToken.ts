import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

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

  // Use Postgres-compatible timestamp type
  @Column({ type: "timestamp" })
  expiresAt!: Date;

  @Column({ default: false })
  isRevoked!: boolean;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ nullable: true })
  rotatedFromId?: number;
}