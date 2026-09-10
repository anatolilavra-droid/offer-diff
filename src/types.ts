export interface LineItemGroundTruth {
  description: string;
  quantity: number;
  unitPrice: number;
  /** Line total as printed on the document. Normally quantity*unitPrice, but a
   * fixture may print a wrong value on purpose to test discrepancy detection. */
  printedLineTotal: number;
}

/** Ground truth used to render a fixture PDF. Kept alongside the PDF so the
 * AI extraction step's output can be checked against a known-correct source
 * instead of trusted on faith. */
export interface OfferGroundTruth {
  docTitle: string;
  offerNumber: string;
  currency: string;
  offerDate: string;
  deliveryDate: string;
  items: LineItemGroundTruth[];
  /** Grand total as printed on the document (may be intentionally wrong). */
  printedGrandTotal: number;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  fileName: string;
  pages: ExtractedPage[];
}

/** Points back to exactly where a value was read from in the source PDF. */
export interface FieldRef {
  page: number;
  snippet: string;
}

export interface StructuredLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  printedLineTotal: number;
  ref: FieldRef;
}

export interface StructuredOffer {
  docTitle: string;
  offerNumber: string | null;
  currency: string;
  offerDate: string | null;
  offerDateRef: FieldRef | null;
  deliveryDate: string | null;
  deliveryDateRef: FieldRef | null;
  items: StructuredLineItem[];
  printedGrandTotal: number | null;
  grandTotalRef: FieldRef | null;
}
