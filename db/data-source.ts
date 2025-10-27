import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Milestone } from '../models/Milestone.js';
import { Comment } from '../models/Comment.js';
import { EmailVerificationCode } from '../models/EmailVerificationCode.js';
import { Notification } from '../models/Notification.js';
import { NotificationPreference } from '../models/NotificationPreference.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { BannedEmail } from '../models/BannedEmail.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { Organization } from '../models/Organization.js';
import { Team } from '../models/Team.js';
import { Membership } from '../models/Membership.js';
import { Thread } from '../models/Thread.js';
import { Attachment } from '../models/Attachment.js';
import { FileVersion } from '../models/FileVersion.js';
import { ExternalLink } from '../models/ExternalLink.js';
import { IntegrationSettings } from '../models/IntegrationSettings.js';
import { RetentionPolicy } from '../models/RetentionPolicy.js';

// Prefer Postgres when DATABASE_URL/RAILWAY_DATABASE_URL is provided; otherwise fall back to SQLite
const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
const usingPostgres = !!dbUrl;

// Use TS migrations only in tsx/ts-node runtime, otherwise only load compiled JS migrations
const useTsMigrations = !!process.env.MIGRATIONS_TS;
const migrationsGlob = useTsMigrations
  ? path.join(process.cwd(), 'migrations', '*.ts')
  : path.join(process.cwd(), 'migrations', '*.js');

export const AppDataSource = new DataSource(
  usingPostgres
    ? {
        type: 'postgres',
        url: dbUrl,
        entities: [
          User,
          Project,
          Task,
          Milestone,
          Comment,
          EmailVerificationCode,
          Notification,
          NotificationPreference,
          SecurityEvent,
          BannedEmail,
          RefreshToken,
          Organization,
          Team,
          Membership,
          Thread,
          Attachment,
          FileVersion,
          ExternalLink,
          IntegrationSettings,
          RetentionPolicy,
        ],
        synchronize: true,
        logging: false,
        // Always ignore self-signed certs for Railway/public hosts
        ssl: true,
        extra: { ssl: { rejectUnauthorized: false } },
        migrations: [migrationsGlob],
      }
    : {
        type: 'sqlite',
        database: path.join(process.cwd(), 'db', 'planara.sqlite'),
        entities: [
          User,
          Project,
          Task,
          Milestone,
          Comment,
          EmailVerificationCode,
          Notification,
          NotificationPreference,
          SecurityEvent,
          BannedEmail,
          RefreshToken,
          Organization,
          Team,
          Membership,
          Thread,
          Attachment,
          FileVersion,
          ExternalLink,
          IntegrationSettings,
          RetentionPolicy,
        ],
        synchronize: true,
        logging: false,
        migrations: [migrationsGlob],
      }
);

export async function initDB() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}
