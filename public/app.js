const form = document.getElementById("compare-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const submitBtn = document.getElementById("submit-btn");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function refCell(ref) {
  if (!ref) return "<span class=\"ref\">—</span>";
  return `<span class="ref">p.${ref.page}: "${escapeHtml(ref.snippet)}"</span>`;
}

function fieldLabel(field) {
  return {
    quantity: "Quantity changed",
    unitPrice: "Unit price changed",
    offerDate: "Offer date changed",
    deliveryDate: "Delivery date changed",
    itemRemoved: "Item removed",
    itemAdded: "Item added",
  }[field] ?? field;
}

function renderResults(data) {
  const parts = [];

  if (data.isMockProvider) {
    parts.push(
      `<div class="mock-banner"><strong>Demo mode:</strong> no funded AI API key is configured, so a deterministic mock parser was used instead of the AI structuring step. Results below are real for this project's own PDF layout, but the mock will not generalize to arbitrary real-world offer PDFs.</div>`
    );
  }

  if (data.scopeWarnings && data.scopeWarnings.length) {
    parts.push(
      `<div class="mock-banner"><strong>Out of scope:</strong><ul>${data.scopeWarnings
        .map((w) => `<li>${escapeHtml(w)}</li>`)
        .join("")}</ul></div>`
    );
  }

  const diff = data.diff;

  if (diff.decline) {
    parts.push(`<div class="decline-banner">Cannot conclude: ${escapeHtml(diff.declineReason)}</div>`);
    resultsEl.innerHTML = parts.join("\n");
    return;
  }

  if (diff.hasNoSubstantiveChanges) {
    parts.push(`<div class="ok-banner">No substantive changes detected. Any differences between the documents are formatting-only.</div>`);
  } else {
    parts.push(`<h2 class="section-title">Substantive changes (${diff.substantiveChanges.length})</h2>`);
    parts.push("<table><thead><tr><th>Change</th><th>Item</th><th>Before</th><th>After</th><th>Original source</th><th>Revised source</th></tr></thead><tbody>");
    for (const c of diff.substantiveChanges) {
      parts.push(
        `<tr><td>${fieldLabel(c.field)}</td><td>${escapeHtml(c.label)}</td><td>${escapeHtml(c.before)}</td><td>${escapeHtml(c.after)}</td><td>${refCell(c.originalRef)}</td><td>${refCell(c.revisedRef)}</td></tr>`
      );
    }
    parts.push("</tbody></table>");
  }

  if (diff.arithmeticDiscrepancies.length) {
    parts.push(`<h2 class="section-title">Arithmetic discrepancies (${diff.arithmeticDiscrepancies.length})</h2>`);
    parts.push("<table><thead><tr><th>Document</th><th>Stated total</th><th>Computed from line items</th><th>Difference</th><th>Source</th></tr></thead><tbody>");
    for (const a of diff.arithmeticDiscrepancies) {
      parts.push(
        `<tr><td>${a.document}</td><td>${a.statedTotal}</td><td>${a.computedTotal}</td><td>${a.difference}</td><td>${refCell(a.ref)}</td></tr>`
      );
    }
    parts.push("</tbody></table>");
  }

  if (diff.uncertainMatches.length) {
    parts.push(`<h2 class="section-title">Uncertain matches — please verify (${diff.uncertainMatches.length})</h2>`);
    parts.push("<table><thead><tr><th>Original item</th><th>Revised item</th><th>Similarity</th></tr></thead><tbody>");
    for (const u of diff.uncertainMatches) {
      parts.push(
        `<tr><td>${escapeHtml(u.originalDescription)} <span class="ref">${refCell(u.originalRef)}</span></td><td>${escapeHtml(u.revisedDescription)} <span class="ref">${refCell(u.revisedRef)}</span></td><td><span class="badge">${u.similarity}</span></td></tr>`
      );
    }
    parts.push("</tbody></table>");
  }

  parts.push(
    `<p class="ref">Processed in ${Math.round(data.timingMs.total)} ms (extraction ${Math.round(data.timingMs.extraction)} ms, structuring ${Math.round(data.timingMs.structuring)} ms). Structuring provider: ${data.usage.original.provider}/${data.usage.original.model}.</p>`
  );

  resultsEl.innerHTML = parts.join("\n");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  statusEl.textContent = "Comparing...";
  resultsEl.innerHTML = "";

  try {
    const formData = new FormData(form);
    const res = await fetch("/api/compare", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      statusEl.textContent = "";
      resultsEl.innerHTML = `<div class="decline-banner">${escapeHtml(data.error ?? "Request failed")}</div>`;
      return;
    }
    statusEl.textContent = "";
    renderResults(data);
  } catch (err) {
    statusEl.textContent = "";
    resultsEl.innerHTML = `<div class="decline-banner">${escapeHtml(err.message)}</div>`;
  } finally {
    submitBtn.disabled = false;
  }
});
