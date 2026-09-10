import "dotenv/config";
import express from "express";
import path from "node:path";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`offer-diff listening on http://localhost:${port}`);
});
