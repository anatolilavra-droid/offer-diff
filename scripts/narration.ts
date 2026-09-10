export interface NarrationSegment {
  key: string;
  text: string;
}

export const NARRATION: NarrationSegment[] = [
  {
    key: "intro",
    text:
      "This is offer dash diff. It compares an original and a revised commercial offer, " +
      "and reports only the changes that actually matter, each one linked back to the source document.",
  },
  {
    key: "normal",
    text:
      "Here's a normal revision. After uploading both P D Fs, it found four real changes: " +
      "a quantity change, a price change, a removed item, and a new delivery date, " +
      "each one referencing the exact line it came from in both documents.",
  },
  {
    key: "ambiguity-intro",
    text:
      "Now a harder case. In this revised offer, one item was renamed, every row was reordered, " +
      "and the printed total was deliberately wrong.",
  },
  {
    key: "ambiguity-result",
    text:
      "The tool still matched the renamed item correctly, flagged it as an uncertain match for a human to double check, " +
      "and caught the arithmetic error, twenty seven dollars fifty off, without silently correcting it.",
  },
  {
    key: "decline",
    text:
      "If the two offers use different currencies, the tool refuses to guess. " +
      "It declines to conclude and explains exactly why.",
  },
  {
    key: "formatting",
    text:
      "And when nothing actually changed, just formatting like date style or capitalization, " +
      "it correctly reports zero substantive changes.",
  },
  {
    key: "closing",
    text:
      "This walkthrough replays the deterministic test fixtures. The real Google Gemini API was independently " +
      "verified against all four scenarios, averaging about seven and a half seconds and under half a cent " +
      "per document pair. Full measurements, cost breakdown, and source code are in the repository.",
  },
];
