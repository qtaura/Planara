import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Organization } from "./Organization.js";

@Entity()
export class Team {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  org!: Organization;

  @Column()
  name!: string;

  @Column()
  slug!: string;

  // Canonical lowercase name for case-insensitive comparisons within org
  @Column()
  nameLower!: string;

  @CreateDateColumn()
  createdAt!: Date;
}