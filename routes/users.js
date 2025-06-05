const express = require("express");
const { promisePool } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.get("/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await promisePool.execute(
      `
      SELECT u.id, u.username, u.email, u.bio, u.avatar, u.created_at,
             COUNT(DISTINCT p.id) as post_count,
             COUNT(DISTINCT f1.id) as followers_count,
             COUNT(DISTINCT f2.id) as following_count,
             EXISTS(SELECT 1 FROM follows f3 WHERE f3.follower_id = ? AND f3.following_id = u.id) as is_following
      FROM users u
      LEFT JOIN posts p ON u.id = p.user_id
      LEFT JOIN follows f1 ON u.id = f1.following_id
      LEFT JOIN follows f2 ON u.id = f2.follower_id
      WHERE u.id = ?
      GROUP BY u.id
    `,
      [req.user.id, userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:userId/follow", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const [users] = await promisePool.execute(
      "SELECT id FROM users WHERE id = ?",
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const [existingFollows] = await promisePool.execute(
      "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?",
      [req.user.id, userId]
    );

    if (existingFollows.length > 0) {
      await promisePool.execute(
        "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
        [req.user.id, userId]
      );
      res.json({ message: "User unfollowed successfully", following: false });
    } else {
      await promisePool.execute(
        "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)",
        [req.user.id, userId]
      );
      res.json({ message: "User followed successfully", following: true });
    }
  } catch (error) {
    console.error("Follow user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:userId/followers", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

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
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:userId/following", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

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
  } catch (error) {
    console.error("Get following error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:search", authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const searchTerm = `%${q.trim()}%`;
    const [users] = await promisePool.execute(
      `
      SELECT u.id, u.username, u.bio, u.avatar,
             COUNT(DISTINCT f.id) as followers_count,
             EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = ? AND f2.following_id = u.id) as is_following
      FROM users u
      LEFT JOIN follows f ON u.id = f.following_id
      WHERE u.username LIKE ? OR u.bio LIKE ?
      AND u.id != ?
      GROUP BY u.id
      ORDER BY u.username ASC
      LIMIT 20
    `,
      [req.user.id, searchTerm, searchTerm, req.user.id]
    );

    res.json({ users });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
