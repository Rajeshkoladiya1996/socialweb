import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import { promisePool } from "../config/database";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/");
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({ storage, fileFilter });

router.post(
  "/",
  authenticateToken,
  upload.single("image"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        res.status(400).json({ error: "Post content is required" });
        return;
      }

      let imagePath: string | null = null;
      if (req.file) {
        imagePath = req.file.path;
      }

      const [result]: any = await promisePool.execute(
        "INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)",
        [req.user!.id, content.trim(), imagePath]
      );

      const [posts]: any[] = await promisePool.execute(
        `
      SELECT p.*, u.username, u.avatar,
             COUNT(DISTINCT l.id) as like_count,
             EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      WHERE p.id = ?
      GROUP BY p.id
      `,
        [req.user!.id, result.insertId]
      );

      res.status(201).json({
        message: "Post created successfully",
        post: posts[0],
      });
      return;
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);

router.get(
  "/",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const [posts]: any[] = await promisePool.execute(
        `
      SELECT p.*, u.username, u.avatar,
             COUNT(DISTINCT l.id) as like_count,
             EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
        [req.user!.id, limit, offset]
      );

      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const updatedPosts = posts.map((post: any) => ({
        ...post,
        avatar: post.avatar ? `${baseUrl}/uploads/avatars/${post.avatar}` : null,
        image: post.image ? `${baseUrl}/${post.image}` : null,
      }));

      const [countResult]: any[] = await promisePool.execute(
        "SELECT COUNT(*) as total FROM posts"
      );

      const totalPosts = countResult[0].total;
      const totalPages = Math.ceil(totalPosts / limit);

      res.json({
        posts: updatedPosts,
        pagination: {
          currentPage: page,
          totalPages,
          totalPosts,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
      return;
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);

router.get(
  "/user/:userId",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const [posts]: any[] = await promisePool.execute(
        `
      SELECT p.*, u.username, u.avatar,
             COUNT(DISTINCT l.id) as like_count,
             EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
        [req.user!.id, userId, limit, offset]
      );

      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const updatedPosts = posts.map((post: any) => ({
        ...post,
        image: post.image ? `${baseUrl}/${post.image}` : null,
      }));

      res.json({ posts: updatedPosts });
      return;
    } catch (error) {
      console.error("Get user posts error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);

router.post(
  "/:postId/like",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;

      const [posts]: any[] = await promisePool.execute(
        "SELECT id FROM posts WHERE id = ?",
        [postId]
      );
      if (posts.length === 0) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      const [existingLikes]: any[] = await promisePool.execute(
        "SELECT id FROM likes WHERE user_id = ? AND post_id = ?",
        [req.user!.id, postId]
      );

      if (existingLikes.length > 0) {
        await promisePool.execute(
          "DELETE FROM likes WHERE user_id = ? AND post_id = ?",
          [req.user!.id, postId]
        );
        res.json({ message: "Post unliked successfully", liked: false });
        return;
      } else {
        await promisePool.execute(
          "INSERT INTO likes (user_id, post_id) VALUES (?, ?)",
          [req.user!.id, postId]
        );
        res.json({ message: "Post liked successfully", liked: true });
        return;
      }
    } catch (error) {
      console.error("Like post error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);

router.delete(
  "/:postId",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;

      const [posts]: any[] = await promisePool.execute(
        "SELECT id FROM posts WHERE id = ? AND user_id = ?",
        [postId, req.user!.id]
      );

      if (posts.length === 0) {
        res.status(404).json({ error: "Post not found or unauthorized" });
        return;
      }

      await promisePool.execute("DELETE FROM posts WHERE id = ?", [postId]);
      res.json({ message: "Post deleted successfully" });
      return;
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
);

export default router;
