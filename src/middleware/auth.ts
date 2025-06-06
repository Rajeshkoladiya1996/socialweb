import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { promisePool } from "../config/database";

interface JwtPayload {
  id: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, secret) as JwtPayload;


    const [users] = await promisePool.execute(
      "SELECT id, username, email FROM users WHERE id = ?",
      [decoded?.id]
    );

    if ((users as any[]).length === 0) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    req.user = (users as any)[0];
    next();
  } catch (error) {
    console.log("error",error)
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

