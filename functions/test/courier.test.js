// Unit tests for the EKART courier charge (run with `npm test`; uses the compiled code in lib/).
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../lib/courierRates.js');
const { priceOrder } = require('../lib/pricing.js');

const R = c.DEFAULT_COURIER_RATES;
const charge = (g, l = 10, w = 10, h = 10) => c.computeEkartCourierCharge({ actualGrams: g, lengthCm: l, widthCm: w, heightCm: h }, R);

test('rate card defaults are the contract values', () => {
  assert.deepEqual(
    { ...R, packagingAllowanceGrams: undefined },
    { carrier: 'ekart', upTo2kg: 90, additionalPerKg: 35, codFixed: 0, codPercent: 0, fuelPercent: 0, gstPercent: 18, volumetricDivisor: 5, rtoUpTo2kg: 0, rtoAdditionalKg: 0, packagingAllowanceGrams: undefined },
  );
  assert.equal(R.packagingAllowanceGrams, 50);
});

test('volumetric weight: 10×10×10 cm = 200 g', () => {
  assert.equal(charge(1).volumetricGrams, 200);
});

test('1.5 kg, 20×15×10 cm → volumetric 600 g, billable 1500 g, ₹106.20', () => {
  const r = charge(1500, 20, 15, 10);
  assert.equal(r.volumetricGrams, 600);
  assert.equal(r.billableGrams, 1500);
  assert.equal(r.basePaise, 9000);
  assert.equal(r.chargePaise, 10620);
});

test('2.0 kg → ₹106.20', () => assert.equal(charge(2000).chargePaise, 10620));
// 90 + 35 = ₹125, plus 18% GST = ₹147.50 (EKART's own estimator returns the same: shippingCharge 125.00, total 147.50).
test('2.1 kg → 90 + 35 = 125 → ₹147.50', () => { const r = charge(2100); assert.equal(r.basePaise, 12500); assert.equal(r.chargePaise, 14750); });
test('3.2 kg → 90 + 35×2 = 160 → ₹188.80', () => { const r = charge(3200); assert.equal(r.basePaise, 16000); assert.equal(r.chargePaise, 18880); });

test('0.5 kg, 40×30×30 cm → volumetric 7200 g, 90 + 35×6 = 300 → ₹354.00', () => {
  const r = charge(500, 40, 30, 30);
  assert.equal(r.volumetricGrams, 7200);
  assert.equal(r.billableGrams, 7200);
  assert.equal(r.basePaise, 30000);
  assert.equal(r.chargePaise, 35400);
});

test('exactly 3.0 kg is one extra slab; 3001 g is two', () => {
  assert.equal(charge(3000).basePaise, 12500);
  assert.equal(charge(3001).basePaise, 16000);
});

test('COD and RTO are ₹0 on the current card', () => {
  const r = c.computeEkartCourierCharge({ actualGrams: 1500, lengthCm: 10, widthCm: 10, heightCm: 10, cod: true, codAmountRupees: 1000 }, R);
  assert.equal(r.codPaise, 0);
  assert.equal(r.chargePaise, 10620);
  assert.equal(c.computeEkartRtoCharge(3200, R), 0);
});

test('rates are configurable (changing the card changes the charge)', () => {
  const custom = c.normaliseCourierRates({ upTo2kg: 100, additionalPerKg: 40, gstPercent: 18, rtoUpTo2kg: 50 });
  assert.equal(c.computeEkartCourierCharge({ actualGrams: 2100, lengthCm: 10, widthCm: 10, heightCm: 10 }, custom).chargePaise, 16520);
  assert.equal(c.computeEkartRtoCharge(1000, custom), 5900);
});

test('bad or missing settings fall back to the contract values', () => {
  assert.deepEqual(c.normaliseCourierRates({ upTo2kg: 'abc', gstPercent: -5 }), R);
  assert.deepEqual(c.normaliseCourierRates(undefined), R);
});

test('parcel estimate: weight × quantity + 50 g packaging, largest box', () => {
  const p = c.estimateParcel([
    { quantity: 2, unitWeightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 5 },
    { quantity: 1, unitWeightGrams: 450, lengthCm: 20, widthCm: 15, heightCm: 10 },
  ], R);
  assert.equal(p.actualGrams, 1500);
  assert.deepEqual([p.lengthCm, p.widthCm, p.heightCm], [20, 15, 10]);
  assert.equal(p.weightIncomplete, false);
  assert.equal(p.dimensionsDefaulted, false);
});

test('product with no weight counts as 1000 g and is flagged; no size → 10×10×10', () => {
  const p = c.estimateParcel([{ quantity: 2, unitWeightGrams: null }], R);
  assert.equal(p.actualGrams, 2050);
  assert.equal(p.weightIncomplete, true);
  assert.equal(p.dimensionsDefaulted, true);
  assert.deepEqual([p.lengthCm, p.widthCm, p.heightCm], [10, 10, 10]);
});

test('full order: ₹1000 product, 20% commission, 1.5 kg parcel → payout ₹693.80', () => {
  const pricing = priceOrder(
    [{ productId: 'p1', name: 'Test', vendorId: 'v1', pricePaise: 100000, quantity: 1 }],
    { v1: 2000 }, null, { shippingFeePaise: 9900, freeShippingThresholdPaise: 149900 },
  );
  const split = pricing.vendorSplits[0];
  assert.equal(split.commissionPaise, 20000);
  assert.equal(split.vendorPayablePaise, 80000);
  // 1450 g of product + 50 g packaging = 1.5 kg
  const est = c.buildCourierEstimate([{ quantity: 1, unitWeightGrams: 1450, lengthCm: 20, widthCm: 15, heightCm: 10 }], R, false, 0);
  assert.equal(est.estimatedGrams, 1500);
  assert.equal(est.estimatedChargePaise, 10620);
  assert.equal(split.vendorPayablePaise - est.estimatedChargePaise, 69380);
  // the ₹99 delivery fee stays with BioCart and is not part of the vendor's share
  assert.equal(pricing.shippingPaise, 9900);
  assert.equal(pricing.totalVendorPayablePaise, 80000);
});
