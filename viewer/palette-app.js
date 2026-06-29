function normalizeFilePath(rawPath) {
  const value = decodeURIComponent(String(rawPath || "").trim());
  if (!value) return "";
  if (value.startsWith("file://")) {
    return decodeURIComponent(value.replace(/^file:\/\//, ""));
  }
  return value;
}

function getExtension(filePath) {
  const normalized = normalizeFilePath(filePath);
  const dot = normalized.lastIndexOf(".");
  if (dot < 0) return "";
  return normalized.slice(dot + 1).toLowerCase();
}

function renderPalette(app, filePath) {
  const fs = require("fs");
  const { parsePaletteFile } = require("../parsers/index");
  const normalizedPath = normalizeFilePath(filePath);
  const buffer = fs.readFileSync(normalizedPath);
  const parsed = parsePaletteFile(normalizedPath, buffer);
  app.innerHTML = window.PaletteViewerRender.renderPalette(parsed);
}

async function refreshPalettePreview(itemId, ext) {
  if (!window.eagle || !window.PaletteViewerRefresh) return;
  if (itemId && typeof eagle.item.getById === "function") {
    const item = await eagle.item.getById(itemId);
    if (item) {
      await window.PaletteViewerRefresh.applyGridThumbnail(item);
    }
  }
  await window.PaletteViewerRefresh.refreshItemsForExtension(ext, {});
}

async function initPaletteViewer() {
  const app = document.getElementById("app");
  const params = new URLSearchParams(window.location.search);
  const filePath = params.get("path");
  const itemId = params.get("id");

  if (!filePath) {
    app.innerHTML = window.PaletteViewerRender.renderError(
      "Missing file path. Open this viewer from Eagle."
    );
    return;
  }

  try {
    renderPalette(app, filePath);
  } catch (error) {
    app.innerHTML = window.PaletteViewerRender.renderError(error.message || String(error));
    return;
  }

  if (typeof eagle !== "undefined" && typeof eagle.onPluginCreate === "function") {
    eagle.onPluginCreate(async () => {
      try {
        await refreshPalettePreview(itemId, getExtension(filePath));
      } catch {
        // Best-effort refresh for library items missing grid thumbnails.
      }
    });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizeFilePath,
    getExtension,
    renderPalette,
    refreshPalettePreview,
    initPaletteViewer
  };
}

if (typeof window !== "undefined") {
  window.PaletteViewerApp = {
    normalizeFilePath,
    getExtension,
    renderPalette,
    refreshPalettePreview,
    initPaletteViewer
  };
}
