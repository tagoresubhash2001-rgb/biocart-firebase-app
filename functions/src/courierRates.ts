/**
 * EKART courier charge — pure calculation, no database access (unit-tested in test/courier.test.js).
 *
 * Contract: "Elite – Flat Rate Card", FORWARD / SURFACE.
 *   up to 2 kg: ₹90 (all zones) · each additional 1 kg or part of it: ₹35 · COD ₹0 · fuel 0% · GST 18% on top
 *   billable weight = the higher of actual weight and volumetric weight (L × B × H in cm ÷ 5 = grams)
 * The numbers live in Firestore settings/courierRates (admin-editable). The rates used for an order
 * are copied onto that order, so a later change never alters orders that were already placed.
 */

export interface CourierRates {
  carrier: 'ekart';
  /** ₹ for a parcel up to 2 kg (GST not included) */
  upTo2kg: number;
  /** ₹ for each additional 1 kg, or part of 1 kg, above 2 kg */
  additionalPerKg: number;
  codFixed: number;
  codPercent: number;
  fuelPercent: number;
  gstPercent: number;
  /** volumetric grams = L × B × H (cm) ÷ this */
  volumetricDivisor: number;
  rtoUpTo2kg: number;
  rtoAdditionalKg: number;
  /** grams added to the products' weight for the box and packing material */
  packagingAllowanceGrams: number;
}

export const DEFAULT_COURIER_RATES: CourierRates = {
  carrier: 'ekart', upTo2kg: 90, additionalPerKg: 35, codFixed: 0, codPercent: 0, fuelPercent: 0, gstPercent: 18,
  volumetricDivisor: 5, rtoUpTo2kg: 0, rtoAdditionalKg: 0, packagingAllowanceGrams: 50,
};

/** Default box when a product has no size on record. */
export const DEFAULT_BOX_CM = { lengthCm: 10, widthCm: 10, heightCm: 10 };
/** Weight assumed for one unit of a product that has no weight on record. */
export const DEFAULT_UNIT_WEIGHT_GRAMS = 1000;

/** Reads a settings document into a complete, safe rate card (bad or missing numbers fall back to the contract values). */
export function normaliseCourierRates(d: any): CourierRates {
  const num = (v: any, fallback: number, min: number, max: number) => {
    const n = Number(v);
    return v !== null && v !== undefined && v !== '' && Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  };
  const D = DEFAULT_COURIER_RATES;
  return {
    carrier: 'ekart',
    upTo2kg: num(d?.upTo2kg, D.upTo2kg, 0, 10000),
    additionalPerKg: num(d?.additionalPerKg, D.additionalPerKg, 0, 10000),
    codFixed: num(d?.codFixed, D.codFixed, 0, 10000),
    codPercent: num(d?.codPercent, D.codPercent, 0, 100),
    fuelPercent: num(d?.fuelPercent, D.fuelPercent, 0, 100),
    gstPercent: num(d?.gstPercent, D.gstPercent, 0, 100),
    volumetricDivisor: num(d?.volumetricDivisor, D.volumetricDivisor, 0.1, 100000),
    rtoUpTo2kg: num(d?.rtoUpTo2kg, D.rtoUpTo2kg, 0, 10000),
    rtoAdditionalKg: num(d?.rtoAdditionalKg, D.rtoAdditionalKg, 0, 10000),
    packagingAllowanceGrams: Math.round(num(d?.packagingAllowanceGrams, D.packagingAllowanceGrams, 0, 5000)),
  };
}

export interface ParcelInput {
  actualGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  /** COD parcels only: amount the courier collects (₹), for the COD percentage. */
  codAmountRupees?: number;
  cod?: boolean;
}

export interface CourierCharge {
  volumetricGrams: number;
  billableGrams: number;
  /** freight before fuel, COD and GST, in paise */
  basePaise: number;
  fuelPaise: number;
  codPaise: number;
  gstPaise: number;
  /** what the seller is charged, in paise (GST included) */
  chargePaise: number;
}

const toPaise = (rupees: number) => Math.round(rupees * 100);

function slabRupees(billableGrams: number, upTo2kg: number, additionalPerKg: number): number {
  if (billableGrams <= 2000) return upTo2kg;
  return upTo2kg + additionalPerKg * Math.ceil((billableGrams - 2000) / 1000);
}

/**
 * THE courier charge formula (forward delivery):
 *   billableGrams = max(actualGrams, ceil(L × B × H ÷ divisor))
 *   base = 90 up to 2 kg, else 90 + 35 × ceil((billableGrams − 2000) ÷ 1000)
 *   charge = (base + fuel + COD) × 1.18, rounded to the paisa
 */
export function computeEkartCourierCharge(parcel: ParcelInput, rates: CourierRates = DEFAULT_COURIER_RATES): CourierCharge {
  const actual = Math.max(1, Math.ceil(Number(parcel.actualGrams) || 0));
  const dims = [parcel.lengthCm, parcel.widthCm, parcel.heightCm].map((x) => Math.max(0, Number(x) || 0));
  const volumetricGrams = Math.ceil((dims[0] * dims[1] * dims[2]) / rates.volumetricDivisor);
  const billableGrams = Math.max(actual, volumetricGrams);
  const basePaise = toPaise(slabRupees(billableGrams, rates.upTo2kg, rates.additionalPerKg));
  const fuelPaise = Math.round((basePaise * rates.fuelPercent) / 100);
  const codPaise = parcel.cod ? toPaise(rates.codFixed) + Math.round((toPaise(Number(parcel.codAmountRupees) || 0) * rates.codPercent) / 100) : 0;
  const beforeTax = basePaise + fuelPaise + codPaise;
  const gstPaise = Math.round((beforeTax * rates.gstPercent) / 100);
  return { volumetricGrams, billableGrams, basePaise, fuelPaise, codPaise, gstPaise, chargePaise: beforeTax + gstPaise };
}

/** Extra charge when a parcel comes back (RTO), from the RTO block of the rate card (currently ₹0). */
export function computeEkartRtoCharge(billableGrams: number, rates: CourierRates = DEFAULT_COURIER_RATES): number {
  const base = toPaise(slabRupees(billableGrams, rates.rtoUpTo2kg, rates.rtoAdditionalKg));
  const withFuel = base + Math.round((base * rates.fuelPercent) / 100);
  return withFuel + Math.round((withFuel * rates.gstPercent) / 100);
}

export interface ParcelItem {
  quantity: number;
  /** weight of one unit in grams, when known */
  unitWeightGrams?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

export interface ParcelEstimate extends ParcelInput {
  /** true when at least one product had no weight on record (1000 g was assumed for it) */
  weightIncomplete: boolean;
  /** true when no product had a box size on record (10 × 10 × 10 cm was assumed) */
  dimensionsDefaulted: boolean;
}

/**
 * One vendor's parcel, estimated from the ordered products:
 *   weight = Σ(product weight × quantity) + packaging allowance (a product with no weight counts as 1000 g)
 *   size   = the product's box; with several products, the largest box; with none on record, 10 × 10 × 10 cm
 */
export function estimateParcel(items: ParcelItem[], rates: CourierRates = DEFAULT_COURIER_RATES): ParcelEstimate {
  let grams = 0;
  let weightIncomplete = false;
  let best: { lengthCm: number; widthCm: number; heightCm: number } | null = null;
  for (const it of items) {
    const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
    const unit = Number(it.unitWeightGrams);
    if (Number.isFinite(unit) && unit > 0) grams += Math.round(unit) * qty;
    else { grams += DEFAULT_UNIT_WEIGHT_GRAMS * qty; weightIncomplete = true; }
    const l = Number(it.lengthCm), w = Number(it.widthCm), h = Number(it.heightCm);
    if ([l, w, h].every((x) => Number.isFinite(x) && x > 0)) {
      if (!best || l * w * h > best.lengthCm * best.widthCm * best.heightCm) best = { lengthCm: l, widthCm: w, heightCm: h };
    }
  }
  const box = best || DEFAULT_BOX_CM;
  return { actualGrams: grams + rates.packagingAllowanceGrams, ...box, weightIncomplete, dimensionsDefaulted: !best };
}

/** Box size of a product document, or null when it is not complete. */
export function productBoxCm(p: any): { lengthCm: number; widthCm: number; heightCm: number } | null {
  const l = Number(p?.lengthCm ?? p?.dimensions?.lengthCm ?? p?.dimensions?.length);
  const w = Number(p?.widthCm ?? p?.dimensions?.widthCm ?? p?.dimensions?.width);
  const h = Number(p?.heightCm ?? p?.dimensions?.heightCm ?? p?.dimensions?.height);
  return [l, w, h].every((x) => Number.isFinite(x) && x > 0 && x <= 300) ? { lengthCm: l, widthCm: w, heightCm: h } : null;
}

/** The `courier` block stored on a vendor order when the order is created. */
export function buildCourierEstimate(items: ParcelItem[], rates: CourierRates, cod: boolean, codAmountRupees: number) {
  const parcel = estimateParcel(items, rates);
  const c = computeEkartCourierCharge({ ...parcel, cod, codAmountRupees }, rates);
  return {
    carrier: 'ekart',
    estimatedGrams: parcel.actualGrams,
    estimatedBoxCm: { lengthCm: parcel.lengthCm, widthCm: parcel.widthCm, heightCm: parcel.heightCm },
    volumetricGrams: c.volumetricGrams,
    billableGrams: c.billableGrams,
    ratesSnapshot: { ...rates },
    estimatedChargePaise: c.chargePaise,
    estimatedCharge: c.chargePaise / 100,
    estimateBreakdown: { basePaise: c.basePaise, fuelPaise: c.fuelPaise, codPaise: c.codPaise, gstPaise: c.gstPaise },
    actualChargePaise: null as number | null,
    actualCharge: null as number | null,
    weightIncomplete: parcel.weightIncomplete,
    dimensionsDefaulted: parcel.dimensionsDefaulted,
    /** 'estimate' until the order is paid, then 'held_estimate' → 'held_actual' | 'released' */
    status: 'estimate',
  };
}
