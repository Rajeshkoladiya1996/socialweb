import express, { Request, Response } from "express";
import { promisePool } from "../config/database";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
  };
}

router.get(
  "/:userId",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid userId" });
        return;
      }

      const [users] = await promisePool.execute(
        `
        SELECT u.id, u.username, u.email, u.bio, u.avatar, u.created_at,
               COUNT(DISTINCT p.id) AS post_count,
               COUNT(DISTINCT f1.id) AS followers_count,
               COUNT(DISTINCT f2.id) AS following_count,
               EXISTS(SELECT 1 FROM follows f3 WHERE f3.follower_id = ? AND f3.following_id = u.id) AS is_following
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
        LEFT JOIN follows f1 ON u.id = f1.following_id
        LEFT JOIN follows f2 ON u.id = f2.follower_id
        WHERE u.id = ?
        GROUP BY u.id
        `,
        [req.user!.id, userId]
      );

      if ((users as any[]).length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ user: (users as any)[0] });
      return;
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);


router.post(
  "/:userId/follow",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid userId" });
        return;
      }

      if (userId === req.user!.id) {
        res.status(400).json({ error: "Cannot follow yourself" });
        return;
      }

      const [users] = await promisePool.execute("SELECT id FROM users WHERE id = ?", [userId]);
      if ((users as any[]).length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const [existingFollows] = await promisePool.execute(
        "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?",
        [req.user!.id, userId]
      );

      if ((existingFollows as any[]).length > 0) {

        await promisePool.execute(
          "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
          [req.user!.id, userId]
        );
        res.json({ message: "User unfollowed successfully", following: false });
        return;
      } else {

        await promisePool.execute(
          "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)",
          [req.user!.id, userId]
        );
        res.json({ message: "User followed successfully", following: true });
        return;
      }
    } catch (error) {
      console.error("Follow user error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);


router.get(
  "/:userId/followers",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid userId" });
        return;
      }

      const [followers] = await promisePool.execute(
        `
        SELECT u.id, u.username, u.avatar, u.bio
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        WHERE f.following_id = ?
        ORDER BY f.created_at DESC
        `,
        [userId]
      );

      res.json({ followers });
      return;
    } catch (error) {
      console.error("Get followers error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);

router.get(
  "/:userId/following",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid userId" });
        return;
      }

      const [following] = await promisePool.execute(
        `
        SELECT u.id, u.username, u.avatar, u.bio
        FROM follows f
        JOIN users u ON f.following_id = u.id
        WHERE f.follower_id = ?
        ORDER BY f.created_at DESC
        `,
        [userId]
      );

      res.json({ following });
      return;
    } catch (error) {
      console.error("Get following error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);


router.get(
  "/search",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const q = req.query.q as string;
      if (!q || q.trim().length === 0) {
        res.status(400).json({ error: "Search query is required" });
        return;
      }

      const searchTerm = `%${q.trim()}%`;

      const [users] = await promisePool.execute(
        `
        SELECT u.id, u.username, u.bio, u.avatar,
               COUNT(DISTINCT f.id) AS followers_count,
               EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = ? AND f2.following_id = u.id) AS is_following
        FROM users u
        LEFT JOIN follows f ON u.id = f.following_id
        WHERE (u.username LIKE ? OR u.bio LIKE ?)
          AND u.id != ?
        GROUP BY u.id
        ORDER BY u.username ASC
        LIMIT 20
        `,
        [req.user!.id, searchTerm, searchTerm, req.user!.id]
      );

      res.json({ users });
      return;
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);

export default router;
