import { GoogleGenAI } from "@google/genai";
import type { PageInput, StructuringProvider, StructuringResult } from "./provider";
import type { StructuredOffer } from "../types";

const fieldRefSchema = {
  type: "object",
  properties: {
    page: { type: "integer" },
    snippet: { type: "string", description: "The verbatim source line this value was read from" },
  },
  required: ["page", "snippet"],
};

const responseJsonSchema = {
  type: "object",
  properties: {
    docTitle: { type: "string" },
    offerNumber: { anyOf: [{ type: "string" }, { type: "null" }] },
    currency: {
      type: "string",
      description: "Currency code or symbol exactly as printed, e.g. USD, EUR, $",
    },
    offerDate: { anyOf: [{ type: "string" }, { type: "null" }] },
    offerDateRef: { anyOf: [fieldRefSchema, { type: "null" }] },
    deliveryDate: { anyOf: [{ type: "string" }, { type: "null" }] },
    deliveryDateRef: { anyOf: [fieldRefSchema, { type: "null" }] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: "number" },
          printedLineTotal: { type: "number" },
          ref: fieldRefSchema,
        },
        required: ["description", "quantity", "unitPrice", "printedLineTotal", "ref"],
      },
    },
    printedGrandTotal: { anyOf: [{ type: "number" }, { type: "null" }] },
    grandTotalRef: { anyOf: [fieldRefSchema, { type: "null" }] },
  },
  required: ["docTitle", "currency", "items"],
};

/**
 * Structures raw PDF text via the Gemini API, using responseJsonSchema +
 * responseMimeType: "application/json" for forced structured output (Gemini's
 * analog to Claude's tool_choice-forced tool use in claudeProvider.ts).
 */
export class GeminiStructuringProvider implements StructuringProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async structureOffer(pages: PageInput[]): Promise<StructuringResult> {
    const pageBlocks = pages.map((p) => `--- page ${p.pageNumber} ---\n${p.text}`).join("\n\n");

    const response = await this.client.models.generateContent({
      model: this.model,
      contents:
        `Below is text extracted from a commercial offer PDF, page by page. ` +
        `Extract its structured contents as JSON matching the provided schema. ` +
        `Transcribe values exactly as printed: do not normalize dates, do not fix arithmetic, ` +
        `do not invent values that are not present in the text. ` +
        `For every field that has a "ref", set "page" to the page number it appears on and ` +
        `"snippet" to the exact source line it came from.\n\n${pageBlocks}`,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini response did not contain any text output");
    }

    const offer = JSON.parse(text) as StructuredOffer;
    const usage = response.usageMetadata;

    return {
      offer,
      usage: {
        provider: "google",
        model: this.model,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
      },
    };
  }
}
