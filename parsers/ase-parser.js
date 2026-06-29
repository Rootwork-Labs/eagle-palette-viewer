const { rgbaFloatToHex } = require("./color-utils");

const BLOCK_COLOR = 0x0001;
const BLOCK_GROUP_START = 0xc001;
const BLOCK_GROUP_END = 0xc002;

const COLOR_CHANNEL_COUNTS = {
  RGB: 3,
  CMYK: 4,
  LAB: 3,
  GRAY: 1
};

function toBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  return Buffer.from(input);
}

function readUtf16Name(buffer, offset) {
  const nameLength = buffer.readUInt16BE(offset);
  let name = "";
  let index = offset + 2;
  const charCount = Math.max(0, nameLength - 1);
  for (let count = 0; count < charCount; count += 1) {
    name += String.fromCharCode(buffer.readUInt16BE(index));
    index += 2;
  }
  return {
    name,
    nextOffset: offset + 2 + nameLength * 2
  };
}

function cmykFloatToHex(c, m, y, k) {
  return rgbaFloatToHex(
    (1 - c) * (1 - k),
    (1 - m) * (1 - k),
    (1 - y) * (1 - k)
  );
}

function readColorValues(buffer, offset, model) {
  const normalized = String(model || "").trim().toUpperCase();
  const channelCount = COLOR_CHANNEL_COUNTS[normalized];
  if (!channelCount) {
    throw new Error(`Unsupported ASE color model: ${model || "(none)"}`);
  }

  const channels = [];
  let index = offset;
  for (let count = 0; count < channelCount; count += 1) {
    channels.push(buffer.readFloatBE(index));
    index += 4;
  }

  if (normalized === "RGB") {
    return { color: rgbaFloatToHex(channels[0], channels[1], channels[2]), nextOffset: index };
  }
  if (normalized === "GRAY") {
    return { color: rgbaFloatToHex(channels[0], channels[0], channels[0]), nextOffset: index };
  }
  if (normalized === "CMYK") {
    return {
      color: cmykFloatToHex(channels[0], channels[1], channels[2], channels[3]),
      nextOffset: index
    };
  }
  throw new Error(`Unsupported ASE color model: ${model}`);
}

function readColorBlock(buffer, offset, blockEnd) {
  const nameInfo = readUtf16Name(buffer, offset);
  const model = buffer.toString("ascii", nameInfo.nextOffset, nameInfo.nextOffset + 4);
  const colorInfo = readColorValues(buffer, nameInfo.nextOffset + 4, model);
  const colorType = buffer.readUInt16BE(colorInfo.nextOffset);
  if (colorInfo.nextOffset + 2 > blockEnd) {
    throw new Error("Invalid ASE color block.");
  }
  return {
    swatch: {
      name: nameInfo.name,
      color: colorInfo.color,
      model: model.trim(),
      colorType
    },
    nextOffset: blockEnd
  };
}

function parseAse(bufferOrBytes, fileName) {
  const buffer = toBuffer(bufferOrBytes);
  if (buffer.length < 12) {
    throw new Error("Invalid ASE file: too small.");
  }
  if (buffer.toString("ascii", 0, 4) !== "ASEF") {
    throw new Error("Invalid ASE file: bad signature.");
  }

  const majorVersion = buffer.readUInt16BE(4);
  const minorVersion = buffer.readUInt16BE(6);
  if (majorVersion !== 1 || minorVersion !== 0) {
    throw new Error(`Unsupported ASE version: ${majorVersion}.${minorVersion}`);
  }

  const blockCount = buffer.readUInt32BE(8);
  const swatches = [];
  let paletteName = String(fileName || "").trim() || "Palette";
  let offset = 12;

  for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
    if (offset + 6 > buffer.length) {
      throw new Error("Invalid ASE file: truncated block header.");
    }

    const blockType = buffer.readUInt16BE(offset);
    const blockLength = buffer.readUInt32BE(offset + 2);
    const blockStart = offset + 6;
    const blockEnd = blockStart + blockLength;
    if (blockEnd > buffer.length) {
      throw new Error("Invalid ASE file: truncated block body.");
    }

    if (blockType === BLOCK_COLOR) {
      const colorBlock = readColorBlock(buffer, blockStart, blockEnd);
      swatches.push(colorBlock.swatch);
    } else if (blockType === BLOCK_GROUP_START) {
      const groupInfo = readUtf16Name(buffer, blockStart);
      if (swatches.length === 0) {
        paletteName = groupInfo.name || paletteName;
      }
    } else if (blockType !== BLOCK_GROUP_END) {
      throw new Error(`Unsupported ASE block type: 0x${blockType.toString(16)}`);
    }

    offset = blockEnd;
  }

  if (swatches.length === 0) {
    throw new Error("No swatches found in ASE file.");
  }

  return {
    kind: "swatch",
    name: paletteName,
    swatches
  };
}

module.exports = {
  BLOCK_COLOR,
  BLOCK_GROUP_START,
  BLOCK_GROUP_END,
  parseAse
};
