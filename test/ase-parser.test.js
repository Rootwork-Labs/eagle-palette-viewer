const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parseAse } = require("../parsers/ase-parser");
const { parsePaletteFile, colorsForThumbnail } = require("../parsers/index");

const fixturesDir = path.join(__dirname, "fixtures");
const samplePath = path.join(fixturesDir, "sample.ase");
const sampleBuffer = fs.readFileSync(samplePath);

const sample = parseAse(sampleBuffer, "Sample");
assert.strictEqual(sample.kind, "swatch");
assert.strictEqual(sample.name, "Sample");
assert.strictEqual(sample.swatches.length, 6);
assert.strictEqual(sample.swatches[0].name, "Blue 500");
assert.strictEqual(sample.swatches[0].color, "#0066ff");
assert.strictEqual(sample.swatches[3].name, "Red 500");
assert.strictEqual(sample.swatches[3].color, "#ff0000");
assert.strictEqual(sample.swatches[0].model, "RGB");

const parsed = parsePaletteFile(samplePath, sampleBuffer);
assert.strictEqual(parsed.type, "ase");
assert.strictEqual(parsed.swatches.length, 6);
assert.deepStrictEqual(colorsForThumbnail(parsed, 3), ["#0066ff", "#00aa00", "#ff7f00"]);

console.log("ASE parser tests passed.");
