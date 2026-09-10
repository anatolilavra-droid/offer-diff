import PDFDocument from "pdfkit";
import fs from "node:fs";
import type { OfferGroundTruth } from "../types";

export type DateStyle = "iso" | "long";
export type NumberStyle = "plain" | "comma";
export type HeaderCase = "title" | "upper";

export interface RenderOptions {
  dateStyle?: DateStyle;
  numberStyle?: NumberStyle;
  headerCase?: HeaderCase;
  /** Row order to print, as indices into items[]. Defaults to natural order. */
  rowOrder?: number[];
}

function formatDate(iso: string, style: DateStyle): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (style === "iso") return iso;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

function formatNumber(n: number, style: NumberStyle): string {
  const fixed = n.toFixed(2);
  if (style === "plain") return fixed;
  const [intPart, decPart] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas}.${decPart}`;
}

export function renderOffer(
  gt: OfferGroundTruth,
  outPath: string,
  opts: RenderOptions = {}
): void {
  const dateStyle = opts.dateStyle ?? "iso";
  const numberStyle = opts.numberStyle ?? "plain";
  const headerCase = opts.headerCase ?? "title";
  const order = opts.rowOrder ?? gt.items.map((_, i) => i);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(fs.createWriteStream(outPath));

  const title = headerCase === "upper" ? gt.docTitle.toUpperCase() : gt.docTitle;
  doc.fontSize(18).text(title, { align: "left" });
  doc.moveDown(0.5);

  doc.fontSize(10);
  doc.text(`Offer Number: ${gt.offerNumber}`);
  doc.text(`Offer Date: ${formatDate(gt.offerDate, dateStyle)}`);
  doc.text(`Delivery Date: ${formatDate(gt.deliveryDate, dateStyle)}`);
  doc.text(`Currency: ${gt.currency}`);
  doc.moveDown(1);

  const colX = { desc: 50, qty: 300, price: 360, total: 450 };
  const headerY = doc.y;
  doc.fontSize(10);
  doc.text("Description", colX.desc, headerY);
  doc.text("Qty", colX.qty, headerY);
  doc.text("Unit Price", colX.price, headerY);
  doc.text("Line Total", colX.total, headerY);
  doc.y = headerY + doc.currentLineHeight();
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);

  for (const idx of order) {
    const item = gt.items[idx];
    const rowY = doc.y;
    doc.text(item.description, colX.desc, rowY, { width: 240 });
    const afterDescY = doc.y;
    doc.text(String(item.quantity), colX.qty, rowY);
    doc.text(formatNumber(item.unitPrice, numberStyle), colX.price, rowY);
    doc.text(formatNumber(item.printedLineTotal, numberStyle), colX.total, rowY);
    doc.y = Math.max(afterDescY, rowY + doc.currentLineHeight());
    doc.moveDown(0.4);
  }

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(11).text(
    `Grand Total (${gt.currency}): ${formatNumber(gt.printedGrandTotal, numberStyle)}`,
    colX.desc
  );

  doc.end();
}
