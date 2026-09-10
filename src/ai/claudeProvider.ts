import Anthropic from "@anthropic-ai/sdk";
import type { PageInput, StructuringProvider, StructuringResult } from "./provider";
import type { StructuredOffer } from "../types";

const TOOL_NAME = "record_offer";

const fieldRefSchema = {
  type: "object" as const,
  properties: {
    page: { type: "integer" },
    snippet: { type: "string", description: "The verbatim source line this value was read from" },
  },
  required: ["page", "snippet"],
};

const inputSchema = {
  type: "object" as const,
  properties: {
    docTitle: { type: "string" },
    offerNumber: { type: ["string", "null"] },
    currency: {
      type: "string",
      description: "Currency code or symbol exactly as printed, e.g. USD, EUR, $",
    },
    offerDate: { type: ["string", "null"], description: "Exactly as printed in the source text" },
    offerDateRef: { anyOf: [fieldRefSchema, { type: "null" }] },
    deliveryDate: { type: ["string", "null"], description: "Exactly as printed in the source text" },
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
    printedGrandTotal: { type: ["number", "null"] },
    grandTotalRef: { anyOf: [fieldRefSchema, { type: "null" }] },
  },
  required: ["docTitle", "currency", "items"],
};

export class ClaudeStructuringProvider implements StructuringProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async structureOffer(pages: PageInput[]): Promise<StructuringResult> {
    const pageBlocks = pages.map((p) => `--- page ${p.pageNumber} ---\n${p.text}`).join("\n\n");

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      tools: [
        {
          name: TOOL_NAME,
          description:
            "Record the structured contents of one commercial offer document, exactly as printed. Do not compute or correct anything, only transcribe what is present in the text.",
          input_schema: inputSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content:
            `Below is text extracted from a commercial offer PDF, page by page. ` +
            `Extract its structured contents using the ${TOOL_NAME} tool. ` +
            `Transcribe values exactly as printed: do not normalize dates, do not fix arithmetic, ` +
            `do not invent values that are not present in the text. ` +
            `For every field that has a "ref", set "page" to the page number it appears on and ` +
            `"snippet" to the exact source line it came from.\n\n${pageBlocks}`,
        },
      ],
    });

    const toolUse = message.content.find(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error("Claude response did not contain a tool_use block for record_offer");
    }

    return {
      offer: toolUse.input as StructuredOffer,
      usage: {
        provider: "anthropic",
        model: this.model,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  }
}
