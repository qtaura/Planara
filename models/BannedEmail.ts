import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
export class BannedEmail {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'datetime' })
  createdAt!: Date;
}