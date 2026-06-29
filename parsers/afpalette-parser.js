const { rgbaFloatToHex, hslFloatToHex } = require("./color-utils");

const MAGIC = 0x414bff00;
const CHUNK_P1CN = 0x506c434e;
const CHUNK_PaLV = 0x50616c56;
const CHUNK_PaNV = 0x50614e56;
const CHUNK_Cols = 0x436f6c73;
const CHUNK_colD = 0x636f6c44;
const CHUNK_Posn = 0x506f736e;
const MARKER_DLOC = Buffer.from("Dloc_");
const COLORSPACE_ABGR = Buffer.from("ABGR");
const COLORSPACE_ALSH = Buffer.from("ALSH");

function toBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  return Buffer.from(input);
}

function readView(buffer) {
  const bytes = toBuffer(buffer);
  return {
    bytes,
    view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  };
}

function skipToChunk(view, start, chunkValue) {
  for (let index = start; index < view.byteLength - 4; index += 1) {
    if (view.getUint32(index, true) === chunkValue) {
      return index + 4;
    }
  }
  return view.byteLength;
}

function readUtf8String(view, start) {
  let index = start;
  const characterCount = view.getUint32(index, true);
  index += 4;
  let text = "";
  const limit = Math.min(characterCount, 256);
  for (let i = 0; i < limit; i += 1) {
    const code = view.getUint8(index);
    index += 1;
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return { text, newIndex: index };
}

function detectSwatchColorSpace(bytes, dlocIndex) {
  const start = Math.max(0, dlocIndex - 24);
  const context = bytes.slice(start, dlocIndex);
  if (context.includes(COLORSPACE_ALSH)) return "hsl";
  if (context.includes(COLORSPACE_ABGR)) return "rgb";
  return "rgb";
}

function readSwatchColor(view, offset, colorSpace) {
  const first = view.getFloat32(offset, true);
  const second = view.getFloat32(offset + 4, true);
  const third = view.getFloat32(offset + 8, true);
  if (colorSpace === "hsl") {
    return hslFloatToHex(first, second, third);
  }
  return rgbaFloatToHex(first, second, third);
}

function parseSwatchPalette(bytes, view) {
  let name = "Palette";
  const nameMarker = Buffer.from("+NClP");
  const nameIndex = bytes.indexOf(nameMarker);
  if (nameIndex >= 0 && nameIndex + 9 <= bytes.length) {
    const length = view.getUint32(nameIndex + 5, true);
    const slice = bytes.slice(nameIndex + 9, nameIndex + 9 + length);
    const parsed = slice.toString("utf8").replace(/\0/g, "").trim();
    if (parsed) name = parsed;
  }

  const swatches = [];
  const names = readSwatchNames(bytes, view);
  let position = 0;
  while (position < bytes.length) {
    const index = bytes.indexOf(MARKER_DLOC, position);
    if (index < 0) break;
    const offset = index + MARKER_DLOC.length;
    if (offset + 12 > bytes.length) break;
    const colorSpace = detectSwatchColorSpace(bytes, index);
    swatches.push({
      color: readSwatchColor(view, offset, colorSpace),
      position: swatches.length
    });
    position = offset + 16;
  }

  const text = bytes.toString("latin1");
  const rgbNameStrings = text.match(/R:\d+ G:\d+ B:\d+/g) || [];
  for (let i = 0; i < swatches.length; i += 1) {
    if (rgbNameStrings[i]) {
      swatches[i].name = rgbNameStrings[i];
    } else if (names[i]) {
      swatches[i].name = names[i];
    }
  }

  return { kind: "swatch", name, swatches };
}

function readSwatchNames(bytes, view) {
  const marker = Buffer.from("VNaP");
  const index = bytes.indexOf(marker);
  if (index < 0 || index + 8 > bytes.length) return [];

  let offset = index + 4;
  view.getUint32(offset, true);
  offset += 4;
  const nameCount = view.getUint32(offset, true);
  offset += 4;

  const names = [];
  for (let i = 0; i < nameCount; i += 1) {
    const nameInfo = readUtf8String(view, offset);
    if (nameInfo.text) names.push(nameInfo.text);
    offset = nameInfo.newIndex;
  }
  return names;
}

function parseGradientPalette(view) {
  let byteIndex = 0;
  let paletteName = "Gradient Palette";
  const names = [];
  const swatches = [];

  byteIndex = skipToChunk(view, byteIndex, CHUNK_P1CN);
  if (byteIndex < view.byteLength) {
    const fileNameInfo = readUtf8String(view, byteIndex);
    if (fileNameInfo.text) paletteName = fileNameInfo.text;
    byteIndex = fileNameInfo.newIndex;
  }

  byteIndex = skipToChunk(view, byteIndex, CHUNK_PaLV);
  if (byteIndex + 4 > view.byteLength) {
    return { kind: "gradient", name: paletteName, swatches };
  }

  const paletteCount = view.getUint32(byteIndex, true);
  byteIndex += 4;

  for (let paletteIndex = 0; paletteIndex < paletteCount; paletteIndex += 1) {
    byteIndex = skipToChunk(view, byteIndex, CHUNK_Posn);
    if (byteIndex + 4 > view.byteLength) break;
    const positionCount = view.getUint32(byteIndex, true);
    byteIndex += 4;
    const positions = [];
    for (let i = 0; i < positionCount; i += 1) {
      const position = view.getFloat64(byteIndex, true);
      byteIndex += 8;
      view.getFloat64(byteIndex, true);
      byteIndex += 8;
      positions.push(position);
    }

    byteIndex = skipToChunk(view, byteIndex, CHUNK_Cols);
    if (byteIndex + 4 > view.byteLength) break;
    const colourCount = view.getUint32(byteIndex, true);
    byteIndex += 4;

    for (let colourIndex = 0; colourIndex < colourCount; colourIndex += 1) {
      byteIndex = skipToChunk(view, byteIndex, CHUNK_colD);
      if (byteIndex >= view.byteLength) break;
      if (view.getUint8(byteIndex) === 0x5f) byteIndex += 1;

      const red = view.getFloat32(byteIndex, true);
      byteIndex += 4;
      const green = view.getFloat32(byteIndex, true);
      byteIndex += 4;
      const blue = view.getFloat32(byteIndex, true);
      byteIndex += 4;
      view.getFloat32(byteIndex, true);
      byteIndex += 4;

      swatches.push({
        color: rgbaFloatToHex(red, green, blue),
        position: positions[colourIndex] ?? colourIndex
      });
    }
  }

  byteIndex = skipToChunk(view, byteIndex, CHUNK_PaNV);
  if (byteIndex + 4 <= view.byteLength) {
    byteIndex += 4;
    const nameCount = view.getUint32(byteIndex, true);
    byteIndex += 4;
    for (let i = 0; i < nameCount; i += 1) {
      const nameInfo = readUtf8String(view, byteIndex);
      if (nameInfo.text) names.push(nameInfo.text);
      byteIndex = nameInfo.newIndex;
    }
  }

  for (let i = 0; i < swatches.length && i < names.length; i += 1) {
    swatches[i].name = names[i];
  }

  return { kind: "gradient", name: paletteName, swatches };
}

function parseAfPalette(input) {
  const { bytes, view } = readView(input);
  if (bytes.length < 8) {
    throw new Error("Invalid afpalette file: too small.");
  }

  const magic = view.getUint32(0, true);
  if (magic !== MAGIC) {
    throw new Error("Invalid afpalette file: bad magic number.");
  }

  if (bytes.includes(Buffer.from("PaLV"))) {
    return parseGradientPalette(view);
  }

  if (bytes.includes(Buffer.from("Dloc_")) || bytes.includes(Buffer.from("VlaP"))) {
    return parseSwatchPalette(bytes, view);
  }

  throw new Error("Unsupported afpalette structure.");
}

module.exports = {
  parseAfPalette,
  MAGIC
};
