import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './User.js';

@Entity()
export class EmailVerificationCode {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ length: 6 })
  code!: string;

  @Column({ nullable: true })
  codeHash?: string;

  @Column()
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: false })
  isUsed!: boolean;

  // Avoid design:type circular reference like in Notification
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: any;
}
