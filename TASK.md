# Original supplied brief (verbatim, as received)

## Compare two commercial offers

A user uploads the original and revised versions of a commercial offer. Show substantive
changes to scope, quantities, unit prices, totals and delivery dates. Every change must
reference both source locations. Do not ask the user to re-enter line items.

Scope: two text-based PDFs up to three pages each, one currency, up to ten line items. No
legal advice or handwritten/scanned-document support is required. Create a fictional offer
and its revision with a renamed item, reordered rows, a quantity change, a price change, a
removed item, a changed date and an intentionally incorrect total. Also change formatting
without changing meaning.

Match corresponding items despite renaming and ordering. Separate uncertain matches from
confirmed changes. Recalculate totals deterministically and show arithmetic discrepancies; do
not silently replace what the source says. Formatting changes must not appear as commercial
changes. Include both PDFs, the expected differences and a formatting-only variant that
should produce no substantive changes. Report missed/false changes, source-reference checks,
processing time and estimated cost per document pair. Keep the output concise enough for
someone deciding whether to approve the revised offer.

## Working agreement and submission

Build a new working prototype for this brief during your assignment window. The main user
flow starts with voice, photos, video or existing documents. Upload buttons, confirmations
and spoken clarifications are fine; asking users to retype the source into a form is not the
solution. Keep the scope small: one language and the specified input limits are enough. Aim
for up to eight focused working hours; stop and describe unfinished parts. The submission
window is stated in this email. Reply if you need to arrange a different start date. Use any
AI tools, models and existing libraries; identify reused components and your own changes. Do
not submit an existing finished product as new work. No accounts, payments or native
app-store release are required. The work and code remain yours.

Create and include the small, reproducible test set described in the brief. Use material you
can share and record the expected outcomes before testing. Include normal input, a
correction or ambiguity, and an input on which the product should ask for clarification or
decline to conclude. The app must process new input, not return prepared answers for the
demo files.

Submit a working browser demo, a repository with setup instructions (private access is
fine), and a video walkthrough up to three minutes. In your delivery notes include the
sample inputs and expected/actual results; what failed; time spent; exact AI tools and
models and one example of how you checked their output. Measure time to a useful result and
the estimated variable cost per operation, including recognition, reasoning, speech, retries
and paid intermediaries. Name the pricing assumptions and separate hosting costs. Free
credits are not zero operating cost. Report measurements rather than promising an untested
speed or cost target.

We assess implementation and quality first (80%): a correct complete flow, difficult inputs,
evidence, usability, measured speed/cost and reproducibility. Product judgment is 20%: useful
scope, sensible tradeoffs and what you would improve next. We supplied the problem; you do
not need to invent a different business or prove sales. A later live session may introduce
one small change or a new input within this scope.

## Deadline

Submission requested within 5 days of receiving the brief (per direct communication from the
evaluator, CodeBridge).

## Note on "voice, photos, video or existing documents"

This specific brief's input is an "existing document" (PDF) — the voice/photo/video
mentions in "Working agreement and submission" describe options for *other* briefs in the
same template family, not a requirement for this one. Treated as UNSPECIFIED/not-applicable
for this task rather than implemented speculatively.
