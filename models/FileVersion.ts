import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Attachment } from "./Attachment.js";

@Entity()
export class FileVersion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Attachment, (att) => att.versions, { onDelete: "CASCADE" })
  attachment!: Attachment;

  @Column({ type: "int" })
  versionNumber!: number;

  @Column({ type: "varchar", length: 512 })
  storagePath!: string; // filesystem path or URL

  @Column({ type: "varchar", length: 128 })
  mimeType!: string;

  @Column({ type: "int" })
  size!: number;

  @CreateDateColumn()
  createdAt!: Date;
}