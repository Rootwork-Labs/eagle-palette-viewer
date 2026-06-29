const { hexToRgb } = require("../parsers/color-utils");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let j = 0; j < 8; j += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const payload = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload), 0);
  return Buffer.concat([length, payload, crc]);
}

function fillRgbaPixel(row, x, rgb, alpha) {
  const offset = x * 4;
  row[offset] = rgb.r;
  row[offset + 1] = rgb.g;
  row[offset + 2] = rgb.b;
  row[offset + 3] = alpha == null ? 255 : alpha;
}

function buildPngFromRgbaRows(width, height, rowBuilder) {
  const filteredRows = [];
  const row = Buffer.alloc(width * 4);

  for (let y = 0; y < height; y += 1) {
    row.fill(0);
    rowBuilder(row, y, width, height);
    const filtered = Buffer.alloc(1 + row.length);
    filtered[0] = 0;
    row.copy(filtered, 1);
    filteredRows.push(filtered);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const zlib = require("zlib");
  const compressed = zlib.deflateSync(Buffer.concat(filteredRows));
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    writeChunk("IHDR", ihdr),
    writeChunk("IDAT", compressed),
    writeChunk("IEND", Buffer.alloc(0))
  ]);
}

function createSwatchStripPng(colors, options) {
  const width = Math.max(1, options && options.width ? options.width : 400);
  const height = Math.max(1, options && options.height ? options.height : 48);
  const list = Array.isArray(colors) ? colors.filter(Boolean) : [];
  const count = Math.max(1, list.length);
  const rgbValues = list.map((color) => hexToRgb(color) || { r: 32, g: 32, b: 36 });

  return buildPngFromRgbaRows(width, height, (row, y, imageWidth) => {
    for (let x = 0; x < imageWidth; x += 1) {
      const swatchIndex = Math.min(count - 1, Math.floor((x / imageWidth) * count));
      fillRgbaPixel(row, x, rgbValues[swatchIndex], 255);
    }
  });
}

function createGridThumbnailPng(colors, options) {
  const size = Math.max(64, options && options.size ? options.size : 400);
  const list = Array.isArray(colors) ? colors.filter(Boolean) : [];
  const count = Math.max(1, list.length);
  const rgbValues = list.map((color) => hexToRgb(color) || { r: 32, g: 32, b: 36 });
  const background = { r: 32, g: 32, b: 36 };
  const padding = Math.round(size * 0.12);
  const stripHeight = Math.max(24, Math.round(size * 0.22));
  const stripTop = Math.round((size - stripHeight) / 2);
  const stripBottom = stripTop + stripHeight - 1;
  const stripWidth = size - padding * 2;

  return buildPngFromRgbaRows(size, size, (row, y, imageWidth) => {
    for (let x = 0; x < imageWidth; x += 1) {
      if (y >= stripTop && y <= stripBottom && x >= padding && x < padding + stripWidth) {
        const localX = x - padding;
        const swatchIndex = Math.min(count - 1, Math.floor((localX / stripWidth) * count));
        fillRgbaPixel(row, x, rgbValues[swatchIndex], 255);
      } else {
        fillRgbaPixel(row, x, background, 255);
      }
    }
  });
}

module.exports = {
  createSwatchStripPng,
  createGridThumbnailPng
};
