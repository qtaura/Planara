import "reflect-metadata";
import { DataSource } from "typeorm";
import path from "path";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Milestone } from "../models/Milestone.js";
import { Comment } from "../models/Comment.js";

// Prefer Postgres when DATABASE_URL/RAILWAY_DATABASE_URL is provided; otherwise fall back to SQLite
const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
const usingPostgres = !!dbUrl;

export const AppDataSource = new DataSource(
  usingPostgres
    ? {
        type: "postgres",
        url: dbUrl,
        entities: [User, Project, Task, Milestone, Comment],
        synchronize: true,
        logging: false,
        // Enable SSL when explicitly requested (e.g., public host with ?sslmode=require)
        ssl: dbUrl && dbUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
      }
    : {
        type: "sqlite",
        database: path.join(process.cwd(), "db", "planara.sqlite"),
        entities: [User, Project, Task, Milestone, Comment],
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