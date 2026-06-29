const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parseCssPalette, pickThumbnailColors } = require("../parsers/css-palette-parser");
const { titleCaseFamily } = require("../parsers/color-utils");

const colorsPath = path.join(__dirname, "fixtures", "colors.css");
const cssText = fs.readFileSync(colorsPath, "utf8");

assert.strictEqual(titleCaseFamily("night-fall"), "Night Fall");

const parsed = parseCssPalette(cssText);
assert.strictEqual(parsed.families.length, 6);
assert.deepStrictEqual(
  parsed.families.map((family) => family.name),
  ["blue", "green", "orange", "red", "violet", "yellow"]
);

const red = parsed.families.find((family) => family.name === "red");
assert.strictEqual(red.swatches[0].token, "--color-red-500");
assert.strictEqual(red.label, "Red");
assert.strictEqual(red.swatches[0].color, "#ff0000");

const thumbnail = pickThumbnailColors(parsed, 2);
assert.strictEqual(thumbnail.length, 2);
assert.deepStrictEqual(thumbnail, ["#0066ff", "#00aa00"]);

const coolorsPath = path.join(__dirname, "fixtures", "coolors.css");
const coolorsText = fs.readFileSync(coolorsPath, "utf8");
const coolors = parseCssPalette(coolorsText);

assert.strictEqual(coolors.families.length, 1);
assert.strictEqual(coolors.families[0].name, "exported");
assert.strictEqual(coolors.families[0].swatches.length, 6);
assert.deepStrictEqual(
  coolors.families[0].swatches.map((swatch) => swatch.color),
  ["#ff0000", "#ff7f00", "#ffd700", "#00aa00", "#0066ff", "#8b00ff"]
);
assert.strictEqual(coolors.families[0].swatches[0].label, "Red");

const coolorsThumb = pickThumbnailColors(coolors, 3);
assert.strictEqual(coolorsThumb.length, 3);
assert.deepStrictEqual(coolorsThumb, ["#ff0000", "#ff7f00", "#ffd700"]);

const themePath = path.join(__dirname, "fixtures", "theme-snippet.css");
const themeText = fs.readFileSync(themePath, "utf8");
const theme = parseCssPalette(themeText);
assert.strictEqual(theme.families.length, 2);
assert.deepStrictEqual(
  theme.families.map((family) => family.name),
  ["blue", "red"]
);
assert.strictEqual(theme.families[0].swatches.length, 3);
assert.strictEqual(theme.families[0].swatches[1].shade, 500);

console.log("CSS palette parser tests passed.");
