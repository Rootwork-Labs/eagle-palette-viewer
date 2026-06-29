const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parseClr, colorFromNSColor } = require("../parsers/clr-parser");
const { parsePaletteFile, colorsForThumbnail } = require("../parsers/index");

const fixturesDir = path.join(__dirname, "fixtures");
const samplePath = path.join(fixturesDir, "sample.clr");

if (!fs.existsSync(samplePath)) {
  require("child_process").execFileSync(
    process.execPath,
    [path.join(__dirname, "..", "scripts", "generate-fixtures.mjs")],
    { stdio: "inherit" }
  );
}

assert.strictEqual(
  colorFromNSColor({ NSComponents: "1 0 0 1" }),
  "#ff0000"
);
assert.strictEqual(
  colorFromNSColor({ NSComponents: "0 0.4 1 1" }),
  "#0066ff"
);

const sampleBuffer = fs.readFileSync(samplePath);
const sample = parseClr(sampleBuffer, "Sample");
assert.strictEqual(sample.kind, "swatch");
assert.strictEqual(sample.name, "Sample");
assert.strictEqual(sample.swatches.length, 6);
assert.deepStrictEqual(
  sample.swatches.map((swatch) => swatch.name),
  ["Red", "Orange", "Yellow", "Green", "Blue", "Violet"]
);
assert.deepStrictEqual(
  sample.swatches.map((swatch) => swatch.color),
  ["#ff0000", "#ff7f00", "#ffd700", "#00aa00", "#0066ff", "#8b00ff"]
);

const parsed = parsePaletteFile(samplePath, sampleBuffer);
assert.strictEqual(parsed.type, "clr");
assert.strictEqual(parsed.swatches.length, 6);
assert.deepStrictEqual(colorsForThumbnail(parsed, 3), ["#ff0000", "#ff7f00", "#ffd700"]);

console.log("CLR parser tests passed.");
