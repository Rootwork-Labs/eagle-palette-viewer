const path = require("path");
const { parseAfPalette } = require("../parsers/afpalette-parser");
const { parseAse } = require("../parsers/ase-parser");
const { parseClr } = require("../parsers/clr-parser");
const { parseCssPalette, pickThumbnailColors } = require("../parsers/css-palette-parser");

function parsePaletteFile(filePath, bufferOrText) {
  const ext = path.extname(filePath || "").toLowerCase();
  if (ext === ".afpalette") {
    const parsed = parseAfPalette(bufferOrText);
    return {
      type: "afpalette",
      kind: parsed.kind,
      name: parsed.name,
      swatches: parsed.swatches
    };
  }
  if (ext === ".ase") {
    const parsed = parseAse(
      bufferOrText,
      path.basename(filePath || "palette.ase", ".ase")
    );
    return {
      type: "ase",
      kind: parsed.kind,
      name: parsed.name,
      swatches: parsed.swatches
    };
  }
  if (ext === ".clr") {
    const parsed = parseClr(
      bufferOrText,
      path.basename(filePath || "palette.clr", ".clr")
    );
    return {
      type: "clr",
      kind: parsed.kind,
      name: parsed.name,
      swatches: parsed.swatches
    };
  }
  if (ext === ".css") {
    const text = Buffer.isBuffer(bufferOrText)
      ? bufferOrText.toString("utf8")
      : String(bufferOrText || "");
    const parsed = parseCssPalette(text);
    return {
      type: "css",
      name: path.basename(filePath || "palette.css", ".css"),
      families: parsed.families,
      ungrouped: parsed.ungrouped
    };
  }
  throw new Error(`Unsupported palette file extension: ${ext || "(none)"}`);
}

function colorsForThumbnail(parsed, limit) {
  if (parsed.type === "afpalette" || parsed.type === "ase" || parsed.type === "clr") {
    return (parsed.swatches || []).slice(0, limit || 12).map((swatch) => swatch.color);
  }
  return pickThumbnailColors(parsed, limit || 12);
}

module.exports = {
  parsePaletteFile,
  colorsForThumbnail
};
