import "dotenv/config";
import { GoogleGenAI, Modality } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { NARRATION } from "./narration";

const OUT_DIR = path.join(__dirname, "..", "docs", "_narration");
const VOICE = "Kore";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseSampleRate(mimeType: string): number {
  const m = mimeType.match(/rate=(\d+)/);
  return m ? Number(m[1]) : 24000;
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY!;
  const ai = new GoogleGenAI({ apiKey });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest: { key: string; text: string; bytes: number; sampleRate: number; durationMs: number }[] = [];
  const DEFAULT_SAMPLE_RATE = 24000;

  for (const seg of NARRATION) {
    const pcmPath = path.join(OUT_DIR, `${seg.key}.pcm`);
    if (fs.existsSync(pcmPath)) {
      const bytes = fs.statSync(pcmPath).size;
      const durationMs = (bytes / (DEFAULT_SAMPLE_RATE * 2)) * 1000;
      manifest.push({ key: seg.key, text: seg.text, bytes, sampleRate: DEFAULT_SAMPLE_RATE, durationMs });
      console.log(`${seg.key}: already generated (${bytes} bytes, ${(durationMs / 1000).toFixed(2)}s), skipping`);
      continue;
    }
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: TTS_MODEL,
          contents: seg.text,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
          },
        });
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (!part?.inlineData?.data) throw new Error(`No audio returned for segment "${seg.key}"`);

        const buf = Buffer.from(part.inlineData.data, "base64");
        const sampleRate = parseSampleRate(part.inlineData.mimeType ?? "");
        const durationMs = (buf.length / (sampleRate * 2)) * 1000; // 16-bit mono PCM

        fs.writeFileSync(pcmPath, buf);
        manifest.push({ key: seg.key, text: seg.text, bytes: buf.length, sampleRate, durationMs });
        fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
        console.log(`${seg.key}: ${buf.length} bytes, ${sampleRate}Hz, ${(durationMs / 1000).toFixed(2)}s`);
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`segment "${seg.key}" attempt ${attempt} failed:`, err instanceof Error ? err.message : err);
        if (attempt < 3) await sleep(3000 * attempt);
      }
    }
    if (!manifest.find((m) => m.key === seg.key)) throw lastErr;
  }

  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  const totalMs = manifest.reduce((s, m) => s + m.durationMs, 0);
  console.log(`\ntotal narration: ${(totalMs / 1000).toFixed(2)}s across ${manifest.length} segments`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
