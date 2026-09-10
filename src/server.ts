import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import { compareOffers } from "./pipeline";
import { selectStructuringProvider } from "./ai/selectProvider";

const app = express();
const port = Number(process.env.PORT ?? 3000);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const { provider, isMock } = selectStructuringProvider();

// Scope limits stated in the brief: up to 3 pages, up to 10 line items per document.
const MAX_PAGES = 3;
const MAX_ITEMS = 10;

app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mockProvider: isMock });
});

app.post(
  "/api/compare",
  upload.fields([
    { name: "original", maxCount: 1 },
    { name: "revised", maxCount: 1 },
  ]),
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

      const scopeErrors: string[] = [];
      for (const [label, offer] of [
        ["original", result.original],
        ["revised", result.revised],
      ] as const) {
        if (offer.items.length > MAX_ITEMS) {
          scopeErrors.push(
            `${label} document has ${offer.items.length} line items, which is above the supported limit of ${MAX_ITEMS}.`
          );
        }
      }
      if (result.pageCount.original > MAX_PAGES) {
        scopeErrors.push(`original document has ${result.pageCount.original} pages, above the supported limit of ${MAX_PAGES}.`);
      }
      if (result.pageCount.revised > MAX_PAGES) {
        scopeErrors.push(`revised document has ${result.pageCount.revised} pages, above the supported limit of ${MAX_PAGES}.`);
      }

      res.json({ ...result, isMockProvider: isMock, scopeWarnings: scopeErrors });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
);

app.listen(port, () => {
  console.log(`offer-diff listening on http://localhost:${port}`);
});
