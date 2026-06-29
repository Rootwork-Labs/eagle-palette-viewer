(async function startPaletteRefreshService() {
  if (typeof eagle === "undefined" || typeof eagle.onPluginCreate !== "function") {
    return;
  }

  eagle.onPluginCreate(async () => {
    try {
      const results = await window.PaletteViewerRefresh.refreshExistingPaletteItems();
      console.log("[Palette Viewer] Refreshed existing library previews:", results);
    } catch (error) {
      console.error("[Palette Viewer] Could not refresh existing previews:", error);
    }
  });
})();
