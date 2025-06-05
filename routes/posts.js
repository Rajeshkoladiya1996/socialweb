const express = require("express");
const multer = require("multer");
const path = require("path");
const { promisePool } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({ storage, fileFilter });

router.post(
  "/",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Post content is required" });
      }

      let imagePath = null;
      if (req.file) {
        imagePath = req.file.path;
      }

      const [result] = await promisePool.execute(
        "INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)",
        [req.user.id, content.trim(), imagePath]
      );

      const [posts] = await promisePool.execute(
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
        [req.user.id, result.insertId]
      );

      res.status(201).json({
        message: "Post created successfully",
        post: posts[0],
      });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get("/", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [posts] = await promisePool.execute(
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
      [req.user.id, limit, offset]
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const updatedPosts = posts.map((post) => ({
      ...post,
      avatar: post.avatar ? `${baseUrl}/uploads/avatars/${post.avatar}` : null,
      image: post.image ? `${baseUrl}/${post.image}` : null,
    }));

    const [countResult] = await promisePool.execute(
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
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/user/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [posts] = await promisePool.execute(
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
      [req.user.id, userId, limit, offset]
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const updatedPosts = posts.map((post) => ({
      ...post,
      image: post.image ? `${baseUrl}/${post.image}` : null,
    }));

    res.json({ posts: updatedPosts });
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:postId/like", authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const [posts] = await promisePool.execute(
      "SELECT id FROM posts WHERE id = ?",
      [postId]
    );
    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const [existingLikes] = await promisePool.execute(
      "SELECT id FROM likes WHERE user_id = ? AND post_id = ?",
      [req.user.id, postId]
    );

    if (existingLikes.length > 0) {
      await promisePool.execute(
        "DELETE FROM likes WHERE user_id = ? AND post_id = ?",
        [req.user.id, postId]
      );
      res.json({ message: "Post unliked successfully", liked: false });
    } else {
      await promisePool.execute(
        "INSERT INTO likes (user_id, post_id) VALUES (?, ?)",
        [req.user.id, postId]
      );
      res.json({ message: "Post liked successfully", liked: true });
    }
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:postId", authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const [posts] = await promisePool.execute(
      "SELECT id FROM posts WHERE id = ? AND user_id = ?",
      [postId, req.user.id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    await promisePool.execute("DELETE FROM posts WHERE id = ?", [postId]);
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
