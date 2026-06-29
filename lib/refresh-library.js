const SUPPORTED_EXTENSIONS = ["afpalette", "ase", "clr", "css"];

async function getItemRecord(item) {
  if (!item || !item.id) return null;
  if (typeof eagle.item.getById === "function") {
    return eagle.item.getById(item.id);
  }
  return item;
}

async function applyGridThumbnail(record) {
  if (!record) return false;

  let refreshed = false;
  if (typeof record.refreshThumbnail === "function") {
    refreshed = await record.refreshThumbnail();
  }

  const updated = await getItemRecord(record);
  if (!updated) return refreshed;

  if (updated.thumbnailPath && typeof updated.setCustomThumbnail === "function") {
    const applied = await updated.setCustomThumbnail(updated.thumbnailPath);
    return Boolean(applied || refreshed);
  }

  return refreshed;
}

function shouldRefreshItem(item, options) {
  if (!options || !options.onlyMissingGridThumbnail) return true;
  return Boolean(item.noPreview || item.noThumbnail);
}

async function refreshItemsForExtension(ext, options) {
  if (!window.eagle || !eagle.item || typeof eagle.item.get !== "function") {
    return { ext, refreshed: 0, skipped: 0 };
  }

  const items = await eagle.item.get({ ext });
  const list = Array.isArray(items) ? items : [];
  const targets = list.filter((item) => shouldRefreshItem(item, options));

  let refreshed = 0;
  let skipped = 0;

  for (const item of targets) {
    try {
      const record = await getItemRecord(item);
      if (!record) {
        skipped += 1;
        continue;
      }
      const ok = await applyGridThumbnail(record);
      if (ok) refreshed += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }

  return { ext, refreshed, skipped, total: list.length };
}

async function refreshExistingPaletteItems() {
  const results = [];
  for (const ext of SUPPORTED_EXTENSIONS) {
    results.push(await refreshItemsForExtension(ext, {}));
  }
  return results;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SUPPORTED_EXTENSIONS,
    applyGridThumbnail,
    refreshItemsForExtension,
    refreshExistingPaletteItems
  };
}

if (typeof window !== "undefined") {
  window.PaletteViewerRefresh = {
    SUPPORTED_EXTENSIONS,
    applyGridThumbnail,
    refreshItemsForExtension,
    refreshExistingPaletteItems
  };
}
