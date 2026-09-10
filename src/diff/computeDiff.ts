import type { StructuredOffer, FieldRef } from "../types";
import { matchItems } from "../matching/matchItems";
import { dateEquals } from "./parseDate";

export type SourceRef = FieldRef;

export interface SubstantiveChange {
  field: "quantity" | "unitPrice" | "offerDate" | "deliveryDate" | "itemRemoved" | "itemAdded";
  label: string;
  before: string | number | null;
  after: string | number | null;
  originalRef: SourceRef | null;
  revisedRef: SourceRef | null;
}

export interface UncertainMatch {
  originalDescription: string;
  revisedDescription: string;
  similarity: number;
  originalRef: SourceRef;
  revisedRef: SourceRef;
}

export interface ArithmeticDiscrepancy {
  document: "original" | "revised";
  statedTotal: number;
  computedTotal: number;
  difference: number;
  ref: SourceRef | null;
}

export interface DiffReport {
  decline: boolean;
  declineReason: string | null;
  substantiveChanges: SubstantiveChange[];
  uncertainMatches: UncertainMatch[];
  arithmeticDiscrepancies: ArithmeticDiscrepancy[];
  hasNoSubstantiveChanges: boolean;
}

/** Half a cent: tolerates float rounding only, not real discrepancies. */
const EPSILON = 0.005;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Deterministic comparison of two structured offers. No AI involved here:
 * item identity comes from matchItems(), everything else is exact-value or
 * tolerant-date comparison so the result is reproducible and auditable.
 */
export function computeDiff(original: StructuredOffer, revised: StructuredOffer): DiffReport {
  const origCurrency = original.currency.trim().toUpperCase();
  const revCurrency = revised.currency.trim().toUpperCase();
  if (origCurrency !== revCurrency) {
    return {
      decline: true,
      declineReason:
        `Currency mismatch: original states "${original.currency}", revised states ` +
        `"${revised.currency}". Refusing to compare amounts across different currencies ` +
        `(this tool assumes both documents use one currency).`,
      substantiveChanges: [],
      uncertainMatches: [],
      arithmeticDiscrepancies: [],
      hasNoSubstantiveChanges: false,
    };
  }

  const substantiveChanges: SubstantiveChange[] = [];
  const uncertainMatches: UncertainMatch[] = [];

  for (const m of matchItems(original.items, revised.items)) {
    if (m.type === "matched") {
      if (m.confidence === "uncertain") {
        uncertainMatches.push({
          originalDescription: m.original.description,
          revisedDescription: m.revised.description,
          similarity: round2(m.similarity),
          originalRef: m.original.ref,
          revisedRef: m.revised.ref,
        });
      }
      if (m.original.quantity !== m.revised.quantity) {
        substantiveChanges.push({
          field: "quantity",
          label: m.revised.description,
          before: m.original.quantity,
          after: m.revised.quantity,
          originalRef: m.original.ref,
          revisedRef: m.revised.ref,
        });
      }
      if (Math.abs(m.original.unitPrice - m.revised.unitPrice) > EPSILON) {
        substantiveChanges.push({
          field: "unitPrice",
          label: m.revised.description,
          before: m.original.unitPrice,
          after: m.revised.unitPrice,
          originalRef: m.original.ref,
          revisedRef: m.revised.ref,
        });
      }
    } else if (m.type === "removed") {
      substantiveChanges.push({
        field: "itemRemoved",
        label: m.original.description,
        before: `${m.original.description} (qty ${m.original.quantity} @ ${m.original.unitPrice})`,
        after: null,
        originalRef: m.original.ref,
        revisedRef: null,
      });
    } else {
      substantiveChanges.push({
        field: "itemAdded",
        label: m.revised.description,
        before: null,
        after: `${m.revised.description} (qty ${m.revised.quantity} @ ${m.revised.unitPrice})`,
        originalRef: null,
        revisedRef: m.revised.ref,
      });
    }
  }

  if (!dateEquals(original.offerDate, revised.offerDate)) {
    substantiveChanges.push({
      field: "offerDate",
      label: "Offer date",
      before: original.offerDate,
      after: revised.offerDate,
      originalRef: original.offerDateRef,
      revisedRef: revised.offerDateRef,
    });
  }
  if (!dateEquals(original.deliveryDate, revised.deliveryDate)) {
    substantiveChanges.push({
      field: "deliveryDate",
      label: "Delivery date",
      before: original.deliveryDate,
      after: revised.deliveryDate,
      originalRef: original.deliveryDateRef,
      revisedRef: revised.deliveryDateRef,
    });
  }

  const arithmeticDiscrepancies: ArithmeticDiscrepancy[] = [];
  for (const [label, doc] of [
    ["original", original],
    ["revised", revised],
  ] as const) {
    if (doc.printedGrandTotal == null) continue;
    const computed = doc.items.reduce((sum, it) => sum + it.printedLineTotal, 0);
    const difference = doc.printedGrandTotal - computed;
    if (Math.abs(difference) > EPSILON) {
      arithmeticDiscrepancies.push({
        document: label,
        statedTotal: doc.printedGrandTotal,
        computedTotal: round2(computed),
        difference: round2(difference),
        ref: doc.grandTotalRef,
      });
    }
  }

  return {
    decline: false,
    declineReason: null,
    substantiveChanges,
    uncertainMatches,
    arithmeticDiscrepancies,
    hasNoSubstantiveChanges: substantiveChanges.length === 0,
  };
}
