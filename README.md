# Palette Viewer

Eagle format extension for previewing Affinity `.afpalette` files, Adobe `.ase` swatch files, and palette-oriented `.css` token files.

Example display:
<img width="1039" height="795" alt="Example of showing ase, css, and afpalettes in Eagle using the plugin." src="https://github.com/user-attachments/assets/fe9378b7-b317-4c92-96ae-9627ec030642" />


When `.afpalette`, `.ase`, or `.css` files are imported into Eagle, this plugin:

1. Generates a horizontal swatch-strip thumbnail for the library grid
2. Opens a palette viewer when the item is opened

## Supported formats

### `.afpalette` (Affinity)

- **Swatch palettes** — reads palette name and ordered swatches from `Dloc_` RGBA float blocks (e.g. `sample.afpalette`)
- **Gradient palettes** — reads `PaLV` / `Cols` / `colD` gradient chunks when present

### `.ase` (Adobe Swatch Exchange)

Reads RGB, grayscale, and CMYK color blocks from flat ASE palettes. Group markers are ignored for display; swatches render in file order.

### `.clr` (macOS color list)

Reads `NSColorList` palettes archived with `NSKeyedArchiver` (RGB, grayscale, and CMYK entries). macOS-only format, but useful for previewing system and app-exported color lists in Eagle.

### `.css`

Parses `--color-{family}-{shade}` custom properties and groups preview by family (Red, Blue, etc.) with shade labels. Non-matching color variables appear under "Other Color Variables".

## Files

- `manifest.json` — format extension manifest (`preview` for `afpalette`, `ase`, `clr`, and `css`)
- `thumbnail/palette.js` — thumbnail generator
- `viewer/palette.html` — palette viewer UI
- `viewer/palette.js` — viewer render helpers
- `parsers/` — shared afpalette/ase/clr/css parsing logic
- `lib/swatch-png.js` — pure-JS PNG swatch-strip writer
- `test/` — parser tests and fixtures

## Install for local Eagle testing

Symlink this repo into Eagle's plugin directory:

```bash
ln -sfn "/path/to/eagle-palette-viewer" "$HOME/Library/Application Support/Eagle/Plugins/ianoff-palette-viewer"
```

Restart Eagle after installing or updating the plugin.

On startup, the background service regenerates thumbnails and applies them to the library grid via `setCustomThumbnail` for existing `.afpalette`, `.ase`, and `.clr` files (no re-import needed). CSS palette files refresh when they are missing grid thumbnails.

If an item still shows a generic icon, open it once or restart Eagle after updating the plugin.

## Test

```bash
npm run generate-fixtures
npm test
```

## Local dev server

```bash
npm run dev
```

Serves static viewer assets at `http://127.0.0.1:5174/`. Full viewer parsing requires Eagle's Node-enabled viewer context (`require('fs')`); use Eagle for end-to-end preview verification.

## Example fixtures

- `test/fixtures/sample.afpalette` — Affinity swatch palette (6 colors)
- `test/fixtures/sample.ase` — Adobe ASE palette (6 colors)
- `test/fixtures/sample.clr` — macOS color list (6 colors)
- `test/fixtures/colors.css` — trimmed CSS token sample
