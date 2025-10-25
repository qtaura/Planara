import "reflect-metadata";
import { DataSource } from "typeorm";
import path from "path";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Milestone } from "../models/Milestone.js";
import { Comment } from "../models/Comment.js";
import { EmailVerificationCode } from "../models/EmailVerificationCode.js";
import { Notification } from "../models/Notification.js";
import { SecurityEvent } from "../models/SecurityEvent.js";
import { BannedEmail } from "../models/BannedEmail.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { Organization } from "../models/Organization.js"
import { Team } from "../models/Team.js"
import { Membership } from "../models/Membership.js"

// Prefer Postgres when DATABASE_URL/RAILWAY_DATABASE_URL is provided; otherwise fall back to SQLite
const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
const usingPostgres = !!dbUrl;

export const AppDataSource = new DataSource(
  usingPostgres
    ? {
        type: "postgres",
        url: dbUrl,
        entities: [User, Project, Task, Milestone, Comment, EmailVerificationCode, Notification, SecurityEvent, BannedEmail, RefreshToken, Organization, Team, Membership],
        synchronize: true,
        logging: false,
        // Always ignore self-signed certs for Railway/public hosts
        ssl: true,
        extra: { ssl: { rejectUnauthorized: false } },
      }
    : {
        type: "sqlite",
        database: path.join(process.cwd(), "db", "planara.sqlite"),
        entities: [User, Project, Task, Milestone, Comment, EmailVerificationCode, Notification, SecurityEvent, BannedEmail, RefreshToken, Organization, Team, Membership],
        synchronize: true,
        logging: false,
      }
);

export async function initDB() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}