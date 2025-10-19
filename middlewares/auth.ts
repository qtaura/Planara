import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"];
  if (!auth) return res.status(401).json({ error: "missing Authorization header" });
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ error: "invalid Authorization format" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = payload.userId as number;
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}