"use strict";

// NUMERIC(15,2) stores up to thirteen integer digits. Convert using paise so
// shorthand and decimal inputs cannot drift through binary multiplication.
const maxPaise = 999999999999999n;
const multipliers = { k: 1000n, l: 100000n, lac: 100000n, lakh: 100000n, lakhs: 100000n, cr: 10000000n, crore: 10000000n, crores: 10000000n };
const pattern = /^(?:₹\s*|rs\.?\s*)?((?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3}|\d+))(?:\.(\d+))?\s*(crores?|cr|lakhs?|lac|l|k)?$/i;

function parseRupees(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (text.length > 64) return null;
  const match = pattern.exec(text);
  if (!match) return null;
  const fraction = match[2] || "";
  const divisor = 10n ** BigInt(fraction.length);
  const multiplier = multipliers[match[3]?.toLowerCase()] || 1n;
  const scaled = BigInt(match[1].replaceAll(",", "") + fraction) * multiplier * 100n;
  if (scaled % divisor !== 0n || scaled / divisor > maxPaise) return null;
  return Number(scaled / divisor) / 100;
}

module.exports = { parseRupees };
