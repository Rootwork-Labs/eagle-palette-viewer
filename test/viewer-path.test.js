const assert = require("assert");
const { normalizeFilePath, getExtension } = require("../viewer/palette-app");

assert.strictEqual(
  normalizeFilePath("file:///tmp/sample.afpalette"),
  "/tmp/sample.afpalette"
);
assert.strictEqual(
  normalizeFilePath("/Users/example/Library%20Support/Eagle/sample.afpalette"),
  "/Users/example/Library Support/Eagle/sample.afpalette"
);
assert.strictEqual(getExtension("/tmp/sample.afpalette"), "afpalette");
assert.strictEqual(getExtension("/tmp/sample.ase"), "ase");
assert.strictEqual(getExtension("/tmp/sample.clr"), "clr");
assert.strictEqual(getExtension("file:///tmp/colors.css"), "css");

console.log("Viewer path helper tests passed.");
