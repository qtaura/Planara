import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from "typeorm";
import { Task } from "./Task.js";
import { Project } from "./Project.js";
import { FileVersion } from "./FileVersion.js";

@Entity()
export class Attachment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Task, (task) => task.attachments, { nullable: true, onDelete: "SET NULL" })
  task?: Task | null;

  @ManyToOne(() => Project, (project) => project.attachments, { nullable: true, onDelete: "SET NULL" })
  project?: Project | null;

  @Column({ type: "varchar", length: 255 })
  filename!: string;

  @Column({ type: "varchar", length: 128 })
  mimeType!: string;

  @Column({ type: "int" })
  size!: number; // latest version size

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "int", default: 1 })
  latestVersionNumber!: number;

  @Column({ type: "int", default: 1 })
  versionCount!: number;

  @OneToMany(() => FileVersion, (fv) => fv.attachment)
  versions!: FileVersion[];
}