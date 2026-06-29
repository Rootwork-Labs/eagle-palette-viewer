function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderSwatchCard(swatch) {
  const background = swatch.color.startsWith("#") ? swatch.color : "#202026";
  const label = swatch.name || swatch.color;
  const sublabel = swatch.name ? swatch.color : "";
  return `
    <div class="swatch-card">
      <div class="swatch-chip" style="background:${escapeHtml(background)}"></div>
      <div class="swatch-meta">
        <strong>${escapeHtml(label)}</strong>
        ${sublabel ? `<span>${escapeHtml(sublabel)}</span>` : ""}
      </div>
    </div>
  `;
}

function renderAfPalette(parsed) {
  const swatches = parsed.swatches || [];
  return `
    <div class="palette-header">
      <h1>${escapeHtml(parsed.name || "Palette")}</h1>
      <p>${escapeHtml(parsed.type === "ase" ? "ASE palette" : parsed.type === "clr" ? "macOS color list" : parsed.kind === "gradient" ? "Gradient palette" : "Swatch palette")} · ${swatches.length} color${swatches.length === 1 ? "" : "s"}</p>
    </div>
    <div class="swatch-grid">
      ${swatches.map(renderSwatchCard).join("")}
    </div>
  `;
}

function renderCssPalette(parsed) {
  const families = parsed.families || [];
  const ungrouped = parsed.ungrouped || [];
  const familyHtml = families.map((family) => `
    <section class="family-section">
      <h2>${escapeHtml(family.label || family.name)}</h2>
      <div class="family-ramp">
        ${family.swatches.map((swatch) => `
          <div class="ramp-chip">
            <div class="ramp-color" style="background:${escapeHtml(swatch.color)}" title="${escapeHtml(swatch.token)}"></div>
            <div class="ramp-label">${escapeHtml(swatch.label || String(swatch.shade))}</div>
          </div>
        `).join("")}
      </div>
    </section>
  `).join("");

  const ungroupedHtml = ungrouped.length > 0 ? `
    <section class="ungrouped-section">
      <h2>Other Color Variables</h2>
      <div class="swatch-grid">
        ${ungrouped.map((entry) => renderSwatchCard({ name: entry.token, color: entry.color })).join("")}
      </div>
    </section>
  ` : "";

  const totalColors = families.reduce((sum, family) => sum + family.swatches.length, 0) + ungrouped.length;

  return `
    <div class="palette-header">
      <h1>${escapeHtml(parsed.name || "CSS Palette")}</h1>
      <p>${families.length} famil${families.length === 1 ? "y" : "ies"} · ${totalColors} color${totalColors === 1 ? "" : "s"}</p>
    </div>
    ${familyHtml || '<div class="empty">No --color-* palette tokens found.</div>'}
    ${ungroupedHtml}
  `;
}

function renderPalette(parsed) {
  if (!parsed) {
    return '<div class="empty">No palette data.</div>';
  }
  if (parsed.type === "afpalette" || parsed.type === "ase" || parsed.type === "clr") {
    return renderAfPalette(parsed);
  }
  if (parsed.type === "css") {
    return renderCssPalette(parsed);
  }
  return '<div class="empty">Unsupported palette type.</div>';
}

function renderError(message) {
  return `<div class="error">${escapeHtml(message)}</div>`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    escapeHtml,
    renderPalette,
    renderError
  };
}

if (typeof window !== "undefined") {
  window.PaletteViewerRender = {
    escapeHtml,
    renderPalette,
    renderError
  };
}
