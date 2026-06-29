const { rgbaFloatToHex } = require("./color-utils");

function toBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  return Buffer.from(input);
}

function parseBinaryPlist(buffer) {
  const bytes = toBuffer(buffer);
  if (bytes.length < 40 || bytes.toString("ascii", 0, 8) !== "bplist00") {
    throw new Error("Invalid CLR file: expected binary plist.");
  }

  const trailer = bytes.subarray(bytes.length - 32);
  const offsetIntSize = trailer[6];
  const objectRefSize = trailer[7];
  const objectCount = Number(trailer.readBigUInt64BE(8));
  const topObject = Number(trailer.readBigUInt64BE(16));
  const offsetTableOffset = Number(trailer.readBigUInt64BE(24));

  function readOffset(index) {
    const start = offsetTableOffset + index * offsetIntSize;
    if (offsetIntSize === 1) return bytes[start];
    if (offsetIntSize === 2) return bytes.readUInt16BE(start);
    if (offsetIntSize === 4) return bytes.readUInt32BE(start);
    return Number(bytes.readBigUInt64BE(start));
  }

  function readSizedInt(offset, size) {
    if (size === 1) return bytes[offset];
    if (size === 2) return bytes.readUInt16BE(offset);
    if (size === 4) return bytes.readUInt32BE(offset);
    return Number(bytes.readBigUInt64BE(offset));
  }

  const parseObject = (objectOffset) => {
    const marker = bytes[objectOffset];
    const type = marker >> 4;
    const info = marker & 0x0f;

    if (type === 0x0) return null;
    if (type === 0x1) {
      return info !== 0;
    }
    if (type === 0x2) {
      const length = info < 15 ? info : readSizedInt(objectOffset + 1, 1 << (bytes[objectOffset + 1] & 0x0f));
      const intOffset = info < 15 ? objectOffset + 1 : objectOffset + 2;
      return readSizedInt(intOffset, length);
    }
    if (type === 0x3) {
      const length = info < 15 ? info : readSizedInt(objectOffset + 1, 1 << (bytes[objectOffset + 1] & 0x0f));
      const floatOffset = info < 15 ? objectOffset + 1 : objectOffset + 2;
      if (length === 4) return bytes.readFloatBE(floatOffset);
      if (length === 8) return bytes.readDoubleBE(floatOffset);
      throw new Error("Unsupported real size in CLR plist.");
    }
    if (type === 0x4) {
      const length = info < 15 ? info : readSizedInt(objectOffset + 1, 1 << (bytes[objectOffset + 1] & 0x0f));
      const dataOffset = info < 15 ? objectOffset + 1 : objectOffset + 2;
      return bytes.subarray(dataOffset, dataOffset + length);
    }
    if (type === 0x5) {
      const length = info < 15 ? info : readSizedInt(objectOffset + 1, 1 << (bytes[objectOffset + 1] & 0x0f));
      const dataOffset = info < 15 ? objectOffset + 1 : objectOffset + 2;
      return bytes.toString("ascii", dataOffset, dataOffset + length);
    }
    if (type === 0x6) {
      const byteLength = info < 15 ? info : readSizedInt(objectOffset + 1, 1 << (bytes[objectOffset + 1] & 0x0f));
      const charCount = byteLength / 2;
      const dataOffset = info < 15 ? objectOffset + 1 : objectOffset + 2;
      let text = "";
      for (let index = 0; index < charCount; index += 1) {
        text += String.fromCharCode(bytes.readUInt16BE(dataOffset + index * 2));
      }
      return text;
    }
    if (type === 0x8) {
      const length = info < 15 ? info : readSizedInt(objectOffset + 1, 1 << (bytes[objectOffset + 1] & 0x0f));
      const uidOffset = info < 15 ? objectOffset + 1 : objectOffset + 2;
      return { UID: readSizedInt(uidOffset, length) };
    }
    if (type === 0xa) {
      const length = info < 15 ? info : readSizedInt(objectOffset + 1, 1 << (bytes[objectOffset + 1] & 0x0f));
      const arrayOffset = info < 15 ? objectOffset + 1 : objectOffset + 2;
      const values = [];
      for (let index = 0; index < length; index += 1) {
        const ref = readSizedInt(arrayOffset + index * objectRefSize, objectRefSize);
        values.push(ref);
      }
      return { __plistArray: values };
    }
    if (type === 0xd) {
      const length = info < 15 ? info : readSizedInt(objectOffset + 1, 1 << (bytes[objectOffset + 1] & 0x0f));
      const dictOffset = info < 15 ? objectOffset + 1 : objectOffset + 2;
      const entries = {};
      for (let index = 0; index < length; index += 1) {
        const keyRef = readSizedInt(dictOffset + index * objectRefSize * 2, objectRefSize);
        const valueRef = readSizedInt(dictOffset + index * objectRefSize * 2 + objectRefSize, objectRefSize);
        entries[keyRef] = valueRef;
      }
      return { __plistDict: entries };
    }

    throw new Error(`Unsupported plist object type: 0x${type.toString(16)}`);
  };

  const objects = [];
  for (let index = 0; index < objectCount; index += 1) {
    try {
      objects.push(parseObject(readOffset(index)));
    } catch (__e) {
      const __e2 = __e instanceof Error ? __e : new Error(String(__e));
      __e2.objectIndex = index;
      __e2.objectOffset = readOffset(index);
      throw __e2;
    }
  }

  return materializePlist(objects[topObject], objects);
}

function materializePlist(node, objects) {
  if (node == null || typeof node !== "object") return node;
  if (Object.prototype.hasOwnProperty.call(node, "UID")) return node;
  if (node.__plistArray) {
    return node.__plistArray.map((ref) => materializePlist(objects[ref], objects));
  }
  if (node.__plistDict) {
    const result = {};
    for (const [keyRef, valueRef] of Object.entries(node.__plistDict)) {
      const key = materializePlist(objects[Number(keyRef)], objects);
      result[String(key)] = materializePlist(objects[valueRef], objects);
    }
    return result;
  }
  return node;
}

function isUid(value) {
  return value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "UID");
}

function normalizeUid(value) {
  if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "CF$UID")) {
    return { UID: value["CF$UID"] };
  }
  return value;
}

function resolveArchivedValue(value, objects) {
  const normalized = normalizeUid(value);
  if (isUid(normalized)) {
    return resolveArchivedObject(objects[normalized.UID], objects);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveArchivedValue(entry, objects));
  }
  if (value && typeof value === "object") {
    const resolved = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "$class") continue;
      resolved[key] = resolveArchivedValue(entry, objects);
    }
    return resolved;
  }
  return value;
}

function resolveArchivedObject(object, objects) {
  if (object == null) return object;
  const normalized = normalizeUid(object);
  if (isUid(normalized)) {
    return resolveArchivedObject(objects[normalized.UID], objects);
  }
  if (typeof object !== "object") return object;

  if (Array.isArray(object)) {
    return object.map((entry) => resolveArchivedValue(entry, objects));
  }

  const resolved = {};
  for (const [key, value] of Object.entries(object)) {
    if (key === "$class") continue;
    resolved[key] = resolveArchivedValue(value, objects);
  }

  if (Array.isArray(resolved["NS.objects"])) {
    return resolved["NS.objects"];
  }

  return resolved;
}

function parsePlistRoot(buffer) {
  const bytes = toBuffer(buffer);
  if (bytes.toString("ascii", 0, 8) === "bplist00") {
    return parseBinaryPlist(bytes);
  }
  const text = bytes.toString("utf8");
  if (text.includes("<plist")) {
    throw new Error("XML CLR palettes are not supported yet.");
  }
  throw new Error("Invalid CLR file: unrecognized plist format.");
}

function floatsFromData(data) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (bytes.length === 16) {
    return [bytes.readDoubleBE(0), bytes.readDoubleBE(8)];
  }
  if (bytes.length >= 32) {
    return [
      bytes.readDoubleBE(0),
      bytes.readDoubleBE(8),
      bytes.readDoubleBE(16),
      bytes.readDoubleBE(24)
    ];
  }
  if (bytes.length === 8) {
    return [bytes.readFloatBE(0), bytes.readFloatBE(4)];
  }
  if (bytes.length >= 16) {
    return [
      bytes.readFloatBE(0),
      bytes.readFloatBE(4),
      bytes.readFloatBE(8),
      bytes.readFloatBE(12)
    ];
  }
  return [];
}

function colorFromNSColor(colorObject) {
  if (!colorObject || typeof colorObject !== "object") {
    return null;
  }

  if (colorObject.NSComponents != null) {
    const parts = String(colorObject.NSComponents).trim().split(/\s+/).map(Number);
    if (parts.length >= 4) {
      return rgbaFloatToHex(parts[0], parts[1], parts[2]);
    }
    if (parts.length === 2) {
      return rgbaFloatToHex(parts[0], parts[0], parts[0]);
    }
  }

  if (colorObject.NSRGB != null) {
    const floats = Buffer.isBuffer(colorObject.NSRGB)
      ? floatsFromData(colorObject.NSRGB)
      : String(colorObject.NSRGB).trim().split(/\s+/).map(Number);
    if (floats.length >= 3) {
      return rgbaFloatToHex(floats[0], floats[1], floats[2]);
    }
  }

  if (colorObject.NSWhite != null) {
    const floats = Buffer.isBuffer(colorObject.NSWhite)
      ? floatsFromData(colorObject.NSWhite)
      : [Number(colorObject.NSWhite)];
    if (floats.length >= 1) {
      return rgbaFloatToHex(floats[0], floats[0], floats[0]);
    }
  }

  if (colorObject.NSCMYK != null) {
    const parts = Buffer.isBuffer(colorObject.NSCMYK)
      ? floatsFromData(colorObject.NSCMYK)
      : String(colorObject.NSCMYK).trim().split(/\s+/).map(Number);
    if (parts.length >= 4) {
      const [c, m, y, k] = parts;
      return rgbaFloatToHex((1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k));
    }
  }

  return null;
}

function parseKeyedArchive(root) {
  if (!root || root.$archiver !== "NSKeyedArchiver" || !Array.isArray(root.$objects)) {
    throw new Error("Invalid CLR file: expected NSKeyedArchiver payload.");
  }

  const objects = root.$objects;
  const top = resolveArchivedValue(root.$top, objects);
  const keys = Array.isArray(top.NSKeys) ? top.NSKeys : [];
  const colors = Array.isArray(top.NSColors) ? top.NSColors : [];

  if (!keys.length || keys.length !== colors.length) {
    throw new Error("Invalid CLR file: NSKeys and NSColors are missing or mismatched.");
  }

  return { keys, colors };
}

function parseClr(bufferOrBytes, fileName) {
  const root = parsePlistRoot(bufferOrBytes);
  const { keys, colors } = parseKeyedArchive(root);
  const swatches = [];

  for (let index = 0; index < keys.length; index += 1) {
    const name = String(keys[index] || `Color ${index + 1}`).trim() || `Color ${index + 1}`;
    const color = colorFromNSColor(colors[index]);
    if (!color) {
      throw new Error(`Unsupported color entry in CLR file: ${name}`);
    }
    swatches.push({ name, color });
  }

  if (!swatches.length) {
    throw new Error("No swatches found in CLR file.");
  }

  return {
    kind: "swatch",
    name: String(fileName || "Palette").trim() || "Palette",
    swatches
  };
}

module.exports = {
  parseClr,
  parseBinaryPlist,
  colorFromNSColor
};
