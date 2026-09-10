import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import { compareOffers } from "./pipeline";
import { selectStructuringProvider } from "./ai/selectProvider";
import { checkAndRecordIp, checkAndRecordDailyBudget } from "./rateLimit";

const app = express();
const port = Number(process.env.PORT ?? 3000);

// Render (and most PaaS) sit behind a reverse proxy; without this, req.ip is the
// proxy's address and per-IP rate limiting would treat every visitor as one client.
app.set("trust proxy", 1);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const { provider, isMock } = selectStructuringProvider();

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mockProvider: isMock });
});

app.post(
  "/api/compare",
  // Rate-limit before spending any CPU/bandwidth on parsing the (up to 20MB of)
  // multipart body -- reject early, not after the expensive part is already done.
  // Only real AI calls are gated: the mock fallback doesn't touch any quota, so
  // limiting it too would just make the no-key demo experience worse for no reason.
  (req, res, next) => {
    if (isMock) return next();

    const ipCheck = checkAndRecordIp(req.ip ?? "unknown");
    if (!ipCheck.allowed) {
      return res.status(429).json({
        error: `Too many requests from this address. Please wait about ${Math.ceil((ipCheck.retryAfterMs ?? 0) / 1000)}s and try again.`,
      });
    }
    const budgetCheck = checkAndRecordDailyBudget();
    if (!budgetCheck.allowed) {
      return res.status(429).json({
        error:
          "This demo's daily AI quota (a deliberately conservative slice of the free tier's " +
          "hard limit -- see docs/cost.md) has been used up for today. Please try again after " +
          "00:00 UTC, or run the project locally with your own API key.",
      });
    }
    next();
  },
  (req, res, next) => {
    upload.fields([
      { name: "original", maxCount: 1 },
      { name: "revised", maxCount: 1 },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      if (err) return next(err);
      next();
    });
  },
  async (req, res) => {
    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const originalFile = files?.original?.[0];
    const revisedFile = files?.revised?.[0];

    if (!originalFile || !revisedFile) {
      return res.status(400).json({ error: "Both 'original' and 'revised' PDF files are required." });
    }
    for (const f of [originalFile, revisedFile]) {
      if (f.mimetype !== "application/pdf") {
        return res.status(400).json({ error: `File "${f.originalname}" is not a PDF.` });
      }
    }

    try {
      const result = await compareOffers(
        provider,
        { fileName: originalFile.originalname, data: originalFile.buffer },
        { fileName: revisedFile.originalname, data: revisedFile.buffer }
      );

      res.json({ ...result, isMockProvider: isMock });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
);

// Catch-all error handler: without this, an error passed via next(err) anywhere above
// would fall through to Express's default handler, which can render an HTML page
// (and, outside production, a stack trace) instead of the JSON this app's UI expects.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

app.listen(port, () => {
  console.log(`offer-diff listening on http://localhost:${port}`);
});
