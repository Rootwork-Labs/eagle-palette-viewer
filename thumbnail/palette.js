const fs = require("fs");
const path = require("path");
const { parsePaletteFile, colorsForThumbnail } = require("../parsers/index");
const { createSwatchStripPng } = require("../lib/swatch-png");

const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 48;

function getImageSize(filePath) {
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      resolve({ width: THUMB_WIDTH, height: THUMB_HEIGHT });
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = (error) => reject(error);
    img.src = filePath;
  });
}

module.exports = async function generatePaletteThumbnail({ src, dest, item }) {
  return new Promise(async (resolve, reject) => {
    try {
      const buffer = fs.readFileSync(src);
      const parsed = parsePaletteFile(src, buffer);
      const colors = colorsForThumbnail(parsed, 12);

      if (colors.length === 0) {
        throw new Error(`No palette colors found in ${path.basename(src)}.`);
      }

      const png = createSwatchStripPng(colors, {
        width: THUMB_WIDTH,
        height: THUMB_HEIGHT
      });
      fs.writeFileSync(dest, png);

      if (!fs.existsSync(dest)) {
        throw new Error("Palette thumbnail generation failed.");
      }

      const size = await getImageSize(dest);
      if (!size.width || !size.height) {
        throw new Error("Palette thumbnail image has invalid dimensions.");
      }

      item.width = size.width;
      item.height = size.height;
      resolve(item);
    } catch (error) {
      reject(error);
    }
  });
};
