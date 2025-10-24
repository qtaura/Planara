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

  // SQLite supports 'datetime' type via TypeORM
  @Column({ type: "datetime" })
  expiresAt!: Date;

  @Column({ default: false })
  isRevoked!: boolean;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ nullable: true })
  rotatedFromId?: number;
}