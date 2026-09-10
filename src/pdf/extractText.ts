import type { ExtractedDocument, ExtractedPage } from "../types";

/**
 * pdfjs-dist ships ESM-only in this version; dynamic import() from our
 * CommonJS build is the supported interop path (Node allows import() from CJS).
 */
async function loadPdfJs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

/**
 * Deterministic text extraction for text-based (non-scanned) PDFs, with the
 * page number each chunk of text came from. No OCR: pages with no embedded
 * text layer will simply extract as empty strings.
 */
export async function extractText(fileName: string, data: Buffer): Promise<ExtractedDocument> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(data),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;

  const pages: ExtractedPage[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    // Group text items into lines using their vertical position, then join
    // left-to-right within a line, so a table row stays on one line of text.
    const lines = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items as any[]) {
      if (typeof item.str !== "string") continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({ x, str: item.str });
    }

    const sortedYs = [...lines.keys()].sort((a, b) => b - a);
    const textLines = sortedYs.map((y) => {
      const parts = lines.get(y)!.sort((a, b) => a.x - b.x);
      return parts.map((p) => p.str).join(" ").replace(/\s+/g, " ").trim();
    });

    pages.push({ pageNumber, text: textLines.filter((l) => l.length > 0).join("\n") });
    await page.cleanup();
  }

  await doc.destroy();
  return { fileName, pages };
}
