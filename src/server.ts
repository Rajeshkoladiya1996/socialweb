import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { initDatabase } from "././config/database";

import authRoutes from "././routes/auth";
import postRoutes from "././routes/posts";
import userRoutes from "././routes/users";

dotenv.config();

const app = express();

app.use(
  cors()
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);

app.get("/api/check", (req: Request, res: Response) => {
  res.json({ status: "is OK", timestamp: new Date().toISOString() });
});


app.use(
  (error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Global error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
