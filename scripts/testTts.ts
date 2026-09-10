import "dotenv/config";
import { GoogleGenAI, Modality } from "@google/genai";
import fs from "node:fs";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY!;
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: "Hello, this is a test of the Gemini text to speech API.",
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    },
  });

  console.log(JSON.stringify(response, null, 2).slice(0, 2000));

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part?.inlineData?.data) {
    const buf = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("/tmp/tts-test.pcm", buf);
    console.log("mimeType:", part.inlineData.mimeType);
    console.log("bytes:", buf.length);
  } else {
    console.log("No inline audio data found in response");
  }
}

main().catch((err) => {
  console.error("TTS test failed:", err);
  process.exit(1);
});
