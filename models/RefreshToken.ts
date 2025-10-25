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
  @Column()
  expiresAt!: Date;

  @Column({ default: false })
  isRevoked!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  rotatedFromId?: number;
}