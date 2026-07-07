import cors from "cors";
import express from "express";
import { config, validateConfig } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { importRouter } from "./routes/import.js";

validateConfig();

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "GrowEasy CSV Importer API",
    version: "1.0.0",
    endpoints: {
      health: "GET /api/health",
      import: "POST /api/import",
      importAsync: "POST /api/import?async=true",
      jobStatus: "GET /api/import/jobs/:jobId",
      jobStream: "GET /api/import/jobs/:jobId/stream",
    },
  });
});

app.use("/api/import", importRouter);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀 GrowEasy CSV Importer API running on http://localhost:${config.port}`);
});

export default app;
