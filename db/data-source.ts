import "reflect-metadata";
import { DataSource } from "typeorm";
import path from "path";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Milestone } from "../models/Milestone.js";
import { Comment } from "../models/Comment.js";

const dbFilePath = path.join(process.cwd(), "db", "planara.sqlite");

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: dbFilePath,
  entities: [User, Project, Task, Milestone, Comment],
  synchronize: true,
  logging: false,
});

export async function initDB() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}