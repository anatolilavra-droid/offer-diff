import { test } from "node:test";
import assert from "node:assert/strict";
import { matchItems } from "../src/matching/matchItems";
import type { StructuredLineItem } from "../src/types";

function item(description: string, quantity: number, unitPrice: number, printedLineTotal: number): StructuredLineItem {
  return { description, quantity, unitPrice, printedLineTotal, ref: { page: 1, snippet: description } };
}

test("exact description match, unchanged item", () => {
  const original = [item("Steel Bracket Type A", 100, 4.5, 450)];
  const revised = [item("Steel Bracket Type A", 100, 4.5, 450)];
  const results = matchItems(original, revised);
  assert.equal(results.length, 1);
  assert.equal(results[0].type, "matched");
  assert.equal((results[0] as any).confidence, "exact");
  assert.equal((results[0] as any).similarity, 1);
});

test("reworded + reordered item is matched, not treated as removed+added", () => {
  const original = [
    item("Steel Bracket Type A", 100, 4.5, 450),
    item("Hex Bolt M8x40", 500, 0.35, 175),
  ];
  // reversed order on purpose
  const revised = [
    item("M8x40 Hex Head Bolt", 450, 0.35, 157.5),
    item("Steel Bracket Type A", 100, 4.5, 450),
  ];
  const results = matchItems(original, revised);
  const matched = results.filter((r) => r.type === "matched");
  const removedOrAdded = results.filter((r) => r.type !== "matched");
  assert.equal(matched.length, 2, "both items should be matched despite reorder+rename");
  assert.equal(removedOrAdded.length, 0);

  const boltMatch = matched.find((m: any) => m.original.description === "Hex Bolt M8x40") as any;
  assert.ok(boltMatch, "bolt item should be found among matches");
  assert.equal(boltMatch.revised.description, "M8x40 Hex Head Bolt");
  assert.ok(boltMatch.similarity >= 0.4 && boltMatch.similarity < 1, `similarity was ${boltMatch.similarity}`);
});

test("removed item has no match in revised", () => {
  const original = [item("Steel Bracket Type A", 100, 4.5, 450), item("Rubber Gasket Ring", 200, 1.2, 240)];
  const revised = [item("Steel Bracket Type A", 100, 4.5, 450)];
  const results = matchItems(original, revised);
  const removed = results.filter((r) => r.type === "removed");
  assert.equal(removed.length, 1);
  assert.equal((removed[0] as any).original.description, "Rubber Gasket Ring");
});

test("completely unrelated item is added, not fuzzily matched", () => {
  const original = [item("Steel Bracket Type A", 100, 4.5, 450)];
  const revised = [item("Steel Bracket Type A", 100, 4.5, 450), item("Onsite Installation Labor", 8, 75, 600)];
  const results = matchItems(original, revised);
  const added = results.filter((r) => r.type === "added");
  assert.equal(added.length, 1);
  assert.equal((added[0] as any).revised.description, "Onsite Installation Labor");
});
