import { Router } from "express";
import multer from "multer";
import { config } from "../config.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import {
  createImportJob,
  getJob,
  processImportSync,
  subscribeToJob,
} from "../services/batchProcessor.js";

function getJobIdParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/csv",
      "text/plain",
      "application/vnd.ms-excel",
    ];
    const isCsv =
      allowed.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith(".csv");

    if (isCsv) {
      cb(null, true);
    } else {
      cb(new AppError(400, "Only CSV files are allowed"));
    }
  },
});

export const importRouter = Router();

importRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, "No CSV file uploaded");
    }

    const asyncMode = req.query.async === "true";

    if (asyncMode) {
      const jobId = createImportJob(req.file.buffer);
      res.status(202).json({
        success: true,
        jobId,
        message: "Import job started",
      });
      return;
    }

    const result = await processImportSync(req.file.buffer);
    res.json({ success: true, data: result });
  })
);

importRouter.get(
  "/jobs/:jobId",
  asyncHandler(async (req, res) => {
    const job = getJob(getJobIdParam(req.params.jobId));
    if (!job) {
      throw new AppError(404, "Job not found");
    }
    res.json({ success: true, data: job });
  })
);

importRouter.get(
  "/jobs/:jobId/stream",
  asyncHandler(async (req, res) => {
    const jobId = getJobIdParam(req.params.jobId);
    const job = getJob(jobId);

    if (!job) {
      throw new AppError(404, "Job not found");
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (data: unknown) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent(job);

    if (job.status === "completed" || job.status === "failed") {
      res.end();
      return;
    }

    const unsubscribe = subscribeToJob(jobId, (progress) => {
      sendEvent(progress);
      if (progress.status === "completed" || progress.status === "failed") {
        unsubscribe();
        res.end();
      }
    });

    req.on("close", () => {
      unsubscribe();
    });
  })
);
