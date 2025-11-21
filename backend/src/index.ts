import express, { Express, Request, Response } from "express";
import cors from "cors";
import config from "./config";
import authRoutes from "./routes/auth.routes";
import imageRoutes from "./routes/image.routes";
import entryRoutes from "./routes/entry.routes";
import userRoutes from "./routes/user.routes";

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "Chain Diary Backend API",
    version: "1.0.0",
    status: "healthy",
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy" });
});

// API Routes
app.use("/auth", authRoutes);
app.use("/image", imageRoutes);
app.use("/entry", entryRoutes);
app.use("/user", userRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`[SERVER] Chain Diary Backend running on port ${PORT}`);
  console.log(`[SERVER] Environment: ${config.nodeEnv}`);
  console.log(`[SERVER] Network: ${config.blockchain.network}`);
  console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
});

export default app;
