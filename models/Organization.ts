import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  slug!: string;

  // Canonical lowercase name for case-insensitive comparisons
  @Column({ unique: true })
  nameLower!: string;

  // Owner user id (numeric) for initial ownership; detailed roles handled via Membership
  @Column()
  ownerUserId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  // Soft delete lifecycle
  @Column({ nullable: true })
  deletedAt?: Date;

  @Column({ nullable: true })
  deleteGraceUntil?: Date;
}
