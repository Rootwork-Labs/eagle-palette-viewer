const { parseColorValue, titleCaseFamily } = require("./color-utils");

const FAMILY_VAR_PATTERN = /--color-([a-z0-9-]+)-(\d+)\s*:\s*([^;]+)/gi;
const SHADE_VAR_PATTERN = /--(?!color-)([a-z0-9-]+)-(\d+)\s*:\s*([^;]+)/gi;
const SIMPLE_VAR_PATTERN = /--([a-z0-9-]+)\s*:\s*([^;]+)/gi;
const GENERIC_COLOR_VAR_PATTERN = /--([a-z0-9-]*color[a-z0-9-]*)\s*:\s*([^;]+)/gi;
const HEX_VALUE_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function isHexValue(value) {
  return HEX_VALUE_PATTERN.test(String(value || "").trim());
}

function normalizeTokenName(name) {
  return String(name || "").trim().toLowerCase();
}

function swatchLabel(token, shade) {
  if (Number.isFinite(shade)) return String(shade);
  const bare = String(token || "").replace(/^--/, "");
  return titleCaseFamily(bare.replace(/_/g, "-"));
}

function parseCssPalette(text) {
  const source = String(text || "");
  const familyMap = new Map();
  const simpleVars = new Map();
  const ungrouped = [];
  const seenTokens = new Set();

  let match;
  FAMILY_VAR_PATTERN.lastIndex = 0;
  while ((match = FAMILY_VAR_PATTERN.exec(source)) !== null) {
    const family = match[1];
    const shade = Number(match[2]);
    const token = `--color-${family}-${shade}`;
    const color = parseColorValue(match[3]);
    if (!color) continue;
    seenTokens.add(token);
    if (!familyMap.has(family)) familyMap.set(family, []);
    familyMap.get(family).push({ shade, token, color });
  }

  SHADE_VAR_PATTERN.lastIndex = 0;
  while ((match = SHADE_VAR_PATTERN.exec(source)) !== null) {
    const family = match[1];
    const shade = Number(match[2]);
    const token = `--${family}-${shade}`;
    if (seenTokens.has(token)) continue;
    const color = parseColorValue(match[3]);
    if (!color) continue;
    seenTokens.add(token);
    if (!familyMap.has(family)) familyMap.set(family, []);
    familyMap.get(family).push({ shade, token, color });
  }

  SIMPLE_VAR_PATTERN.lastIndex = 0;
  while ((match = SIMPLE_VAR_PATTERN.exec(source)) !== null) {
    const token = `--${match[1]}`;
    if (seenTokens.has(token) || /^--color-[a-z0-9-]+-\d+$/.test(token)) continue;
    if (/^(?!color-).+-\d+$/.test(match[1])) continue;

    const color = parseColorValue(match[2]);
    if (!color) continue;

    const key = normalizeTokenName(match[1]);
    const existing = simpleVars.get(key);
    if (existing) {
      if (!isHexValue(existing.rawValue) && isHexValue(match[2])) {
        simpleVars.set(key, { token, color, rawValue: match[2].trim() });
      }
      continue;
    }
    simpleVars.set(key, { token, color, rawValue: match[2].trim() });
  }

  GENERIC_COLOR_VAR_PATTERN.lastIndex = 0;
  while ((match = GENERIC_COLOR_VAR_PATTERN.exec(source)) !== null) {
    const token = `--${match[1]}`;
    if (seenTokens.has(token) || /^--color-[a-z0-9-]+-\d+$/.test(token)) continue;
    if (simpleVars.has(normalizeTokenName(match[1]))) continue;
    const color = parseColorValue(match[2]);
    if (!color) continue;
    ungrouped.push({ token, color });
  }

  const families = Array.from(familyMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, swatches]) => ({
      name,
      label: titleCaseFamily(name),
      swatches: swatches
        .sort((left, right) => left.shade - right.shade)
        .map((swatch) => ({
          ...swatch,
          label: swatchLabel(swatch.token, swatch.shade)
        }))
    }));

  if (simpleVars.size > 0) {
    const swatches = Array.from(simpleVars.values()).map((entry) => ({
      token: entry.token,
      color: entry.color,
      shade: null,
      label: swatchLabel(entry.token, null)
    }));
    families.push({
      name: "exported",
      label: "Exported Palette",
      swatches
    });
  }

  families.sort((left, right) => {
    if (left.name === "exported") return 1;
    if (right.name === "exported") return -1;
    return left.name.localeCompare(right.name);
  });

  return { families, ungrouped };
}

function pickThumbnailColors(parsed, limit) {
  const max = Math.max(1, limit || 12);
  const families = parsed.families || [];
  const designFamilies = families.filter((family) => family.name !== "exported");
  const exportedFamily = families.find((family) => family.name === "exported");

  if (designFamilies.length === 0 && exportedFamily) {
    return exportedFamily.swatches.slice(0, max).map((swatch) => swatch.color);
  }

  const colors = [];
  for (const family of designFamilies) {
    const preferred = family.swatches.find((swatch) => swatch.shade === 500)
      || family.swatches[Math.floor(family.swatches.length / 2)]
      || family.swatches[0];
    if (preferred) colors.push(preferred.color);
    if (colors.length >= max) break;
  }
  if (colors.length > 0) return colors.slice(0, max);

  if (exportedFamily) {
    return exportedFamily.swatches.slice(0, max).map((swatch) => swatch.color);
  }

  if (parsed.swatches) {
    return parsed.swatches.slice(0, max).map((swatch) => swatch.color);
  }

  for (const entry of parsed.ungrouped || []) {
    colors.push(entry.color);
    if (colors.length >= max) break;
  }
  return colors.slice(0, max);
}

module.exports = {
  parseCssPalette,
  pickThumbnailColors
};
