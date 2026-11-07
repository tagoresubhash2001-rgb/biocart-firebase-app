/**
 * Parcel weight from the size/weight option the customer picked (e.g. "10gms", "500 g", "1kg", "2 Kg", "1 L", "250ml").
 * Liquids are counted as 1 ml = 1 g. Returns null when the option is not a weight (e.g. "Set of 24").
 */
export function variantWeightGrams(label: unknown): number | null {
  const s = String(label ?? '').toLowerCase().replace(/,/g, '').trim();
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(kgs?|kilo(?:gram)?s?|kilos?|grams?|gms?|gm|g|ltrs?|litres?|liters?|l|ml)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = m[2];
  const grams = /^(kg|kgs|kilo)/.test(u) ? n * 1000 : /^(l|ltr|litre|liter)/.test(u) ? n * 1000 : n; // g / gm / gms / ml
  const r = Math.round(grams);
  return r > 0 && r <= 100_000 ? r : null;
}

/** Weight of one unit of a product: chosen option first, then the product's own shipping weight. */
export function unitWeightGrams(product: any, variant: string | null): number | null {
  const fromVariant = variantWeightGrams(variant);
  if (fromVariant) return fromVariant;
  const explicit = Number(product?.shippingWeightGrams ?? product?.weightGrams);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  const kg = Number(product?.weightKg ?? product?.weight);
  if (Number.isFinite(kg) && kg > 0) return Math.round(kg < 50 ? kg * 1000 : kg);
  return variantWeightGrams(product?.selectedVariant) ?? variantWeightGrams(product?.unit) ?? null;
}
