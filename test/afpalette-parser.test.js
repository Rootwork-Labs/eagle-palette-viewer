const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parseAfPalette } = require("../parsers/afpalette-parser");
const { parseCssPalette, pickThumbnailColors } = require("../parsers/css-palette-parser");
const { normalizeHex, rgbaFloatToHex } = require("../parsers/color-utils");
const { parsePaletteFile, colorsForThumbnail } = require("../parsers/index");
const { createSwatchStripPng } = require("../lib/swatch-png");

const fixturesDir = path.join(__dirname, "fixtures");
const samplePath = path.join(fixturesDir, "sample.afpalette");
const colorsPath = path.join(fixturesDir, "colors.css");

assert.strictEqual(normalizeHex("#abc"), "#aabbcc");
assert.strictEqual(rgbaFloatToHex(1, 0, 0), "#ff0000");

const sampleBuffer = fs.readFileSync(samplePath);
const sample = parseAfPalette(sampleBuffer);
assert.strictEqual(sample.kind, "swatch");
assert.strictEqual(sample.name, "Sample");
assert.strictEqual(sample.swatches.length, 6);
assert.strictEqual(sample.swatches[0].color, "#0066ff");
assert.strictEqual(sample.swatches[0].name, "Blue 500");
assert.strictEqual(sample.swatches[3].color, "#ff0000");
assert.strictEqual(sample.swatches[3].name, "Red 500");

const graysPath = path.join(fixturesDir, "grays.afpalette");
const graysBuffer = fs.readFileSync(graysPath);
const grays = parseAfPalette(graysBuffer);
assert.strictEqual(grays.kind, "swatch");
assert.strictEqual(grays.swatches.length > 0, true);

const cssText = fs.readFileSync(colorsPath, "utf8");
const css = parseCssPalette(cssText);
assert.strictEqual(css.families.length, 6);
assert.deepStrictEqual(
  css.families.map((family) => family.name),
  ["blue", "green", "orange", "red", "violet", "yellow"]
);

const thumbColors = pickThumbnailColors(css, 12);
assert.strictEqual(thumbColors.length, 6);
assert.ok(thumbColors.includes("#ff0000"));
assert.ok(thumbColors.includes("#0066ff"));

const parsedSample = parsePaletteFile(samplePath, sampleBuffer);
assert.strictEqual(parsedSample.type, "afpalette");
assert.strictEqual(colorsForThumbnail(parsedSample, 3).length, 3);

const parsedCss = parsePaletteFile(colorsPath, cssText);
assert.strictEqual(parsedCss.type, "css");
assert.strictEqual(parsedCss.families.length, 6);

const sampleAsePath = path.join(fixturesDir, "sample.ase");
const sampleAseBuffer = fs.readFileSync(sampleAsePath);
const parsedAse = parsePaletteFile(sampleAsePath, sampleAseBuffer);
assert.strictEqual(parsedAse.type, "ase");
assert.strictEqual(parsedAse.swatches.length, 6);
assert.strictEqual(colorsForThumbnail(parsedAse, 4).length, 4);

const sampleClrPath = path.join(fixturesDir, "sample.clr");
const sampleClrBuffer = fs.readFileSync(sampleClrPath);
const parsedClr = parsePaletteFile(sampleClrPath, sampleClrBuffer);
assert.strictEqual(parsedClr.type, "clr");
assert.strictEqual(parsedClr.swatches.length, 6);
assert.strictEqual(colorsForThumbnail(parsedClr, 3).length, 3);

const png = createSwatchStripPng(["#ff0000", "#0066ff", "#ffd700"], { width: 120, height: 24 });
assert.ok(Buffer.isBuffer(png));
assert.strictEqual(png.slice(0, 8).toString("hex"), "89504e470d0a1a0a");

console.log("All palette format extension tests passed.");
