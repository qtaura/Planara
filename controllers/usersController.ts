import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../db/data-source.js";
import { User } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function sanitize(user: User) {
  const { hashedPassword, ...rest } = user as any;
  return rest;
}

export async function getUsers(_req: Request, res: Response) {
  const repo = AppDataSource.getRepository(User);
  const users = await repo.find();
  res.json(users.map(sanitize));
}

export async function signup(req: Request, res: Response) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }
  const repo = AppDataSource.getRepository(User);
  const exists = await repo.findOne({ where: [{ username }, { email }] });
  if (exists) {
    return res.status(409).json({ error: "username or email already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = repo.create({ username, email, hashedPassword });
  await repo.save(user);
  res.status(201).json(sanitize(user));
}

export async function login(req: Request, res: Response) {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "usernameOrEmail and password are required" });
  }
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });
  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const ok = await bcrypt.compare(password, user.hashedPassword);
  if (!ok) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: sanitize(user) });
}

export async function updateProfile(req: Request, res: Response) {
  const userIdFromToken = (req as any).userId as number | undefined;
  const id = Number(req.params.id ?? userIdFromToken);
  if (!id) return res.status(401).json({ error: "unauthorized" });

  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id } });
  if (!user) return res.status(404).json({ error: "user not found" });

  const { username, email, password, teamId } = req.body;
  if (username) user.username = username;
  if (email) user.email = email;
  if (typeof teamId !== "undefined") user.teamId = teamId;
  if (password) user.hashedPassword = await bcrypt.hash(password, 10);

  await repo.save(user);
  res.json(sanitize(user));
}