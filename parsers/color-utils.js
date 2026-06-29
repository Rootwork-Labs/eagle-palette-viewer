const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR_PATTERN = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i;

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHex(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (!HEX_COLOR_PATTERN.test(withHash)) return null;
  if (withHash.length === 4) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return withHash.slice(0, 7);
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbaFloatToHex(r, g, b) {
  const red = clampByte(r * 255);
  const green = clampByte(g * 255);
  const blue = clampByte(b * 255);
  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}

function hslFloatToHex(h, s, l) {
  let hue = ((Number(h) % 1) + 1) % 1;
  const sat = Math.max(0, Math.min(1, Number(s)));
  const light = Math.max(0, Math.min(1, Number(l)));

  if (sat <= 0) {
    const gray = clampByte(light * 255);
    return `#${gray.toString(16).padStart(2, "0").repeat(3)}`;
  }

  const hueToRgb = (p, q, t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  return rgbaFloatToHex(
    hueToRgb(p, q, hue + 1 / 3),
    hueToRgb(p, q, hue),
    hueToRgb(p, q, hue - 1 / 3)
  );
}

function rgbBytesToHex(r, g, b) {
  return `#${clampByte(r).toString(16).padStart(2, "0")}${clampByte(g).toString(16).padStart(2, "0")}${clampByte(b).toString(16).padStart(2, "0")}`;
}

function parseColorValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const hex = normalizeHex(raw);
  if (hex) return hex;
  const rgbMatch = raw.match(RGB_COLOR_PATTERN);
  if (rgbMatch) {
    return rgbBytesToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]));
  }
  return null;
}

function colorToCssBackground(color) {
  const hex = normalizeHex(color);
  return hex || color;
}

function titleCaseFamily(name) {
  return String(name || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

module.exports = {
  normalizeHex,
  hexToRgb,
  rgbaFloatToHex,
  hslFloatToHex,
  rgbBytesToHex,
  parseColorValue,
  colorToCssBackground,
  titleCaseFamily
};
