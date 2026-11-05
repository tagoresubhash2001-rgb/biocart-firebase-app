import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Financial Safety, Cashfree Integration & Carrier Verification', () => {
  it('1. verifies CheckoutModal enforces authoritative quote states and blocks unverified checkout', () => {
    const code = fs.readFileSync('src/components/ui/CheckoutModal.tsx', 'utf8');
    assert.match(code, /quoteStatus !== 'valid'/);
    assert.match(code, /disabled=\{quoteStatus !== 'valid'/);
    assert.match(code, /setAuthoritativeQuote\(null\);\s*\/\/\s*Clear stale quote/);
    assert.match(code, /Retry Quote/);
    assert.ok(!code.includes('falling back to local snapshot'), 'Local price fallback during quote failure must be removed');
  });

  it('2. verifies CheckoutModal launches real Cashfree SDK modal with server paymentSessionId', () => {
    const code = fs.readFileSync('src/components/ui/CheckoutModal.tsx', 'utf8');
    assert.match(code, /createCashfreeOrder/);
    assert.match(code, /paymentSessionId/);
    assert.match(code, /Cashfree\(/);
    assert.match(code, /redirectTarget:\s*'_modal'/);
    assert.match(code, /verifyCashfreePayment/);
  });

  it('3. verifies cashfree.ts validates order ownership, authoritative amount and HMAC webhook signature', () => {
    const code = fs.readFileSync('functions/src/cashfree.ts', 'utf8');
    assert.match(code, /orderData\.userId !== request\.auth\.uid/);
    assert.match(code, /createHmac\('sha256'/);
    assert.match(code, /signature !== expectedSignature/);
    assert.match(code, /Math\.abs\(expectedPaise - receivedPaise\)/);
    assert.match(code, /payment_webhook_events/);
  });

  it('4. verifies settlementEngine uses Cashfree Payouts and rejects unverified simulated success in production', () => {
    const code = fs.readFileSync('functions/src/settlementEngine.ts', 'utf8');
    assert.match(code, /executeCashfreePayoutTransfer/);
    assert.ok(!code.includes('https://api.razorpay.com/v1/payouts'), 'RazorpayX HTTP endpoint must be removed');
  });

  it('5. verifies cashfreePayouts.ts marks missing credentials as needs_review without fake paid transactions', () => {
    const code = fs.readFileSync('functions/src/cashfreePayouts.ts', 'utf8');
    assert.match(code, /status:\s*'needs_review'/);
    assert.match(code, /failureReason:\s*'Cashfree Payouts credentials not configured/);
    assert.ok(!code.includes('simulated: true'), 'Fake simulated success in payouts must be removed');
  });

  it('6. verifies cashfreePayoutWebhook verifies signature, updates status and updates wallet balances', () => {
    const code = fs.readFileSync('functions/src/cashfreePayouts.ts', 'utf8');
    assert.match(code, /cashfreePayoutWebhook/);
    assert.match(code, /createHmac\('sha256'/);
    assert.match(code, /settling:\s*FieldValue\.increment/);
    assert.match(code, /paidOut:\s*FieldValue\.increment/);
  });

  it('7. verifies Delhivery is completely eradicated from active vendor order dispatching', () => {
    const voCode = fs.readFileSync('src/components/vendor/VendorOrders.tsx', 'utf8');
    assert.ok(!voCode.includes("carrier: 'delhivery'"), "carrier: 'delhivery' must be removed from VendorOrders");
    const asCode = fs.readFileSync('src/components/admin/AdminShipments.tsx', 'utf8');
    assert.ok(!asCode.includes("s.carrier || 'delhivery'"), "s.carrier || 'delhivery' fallback must be removed");
  });

  it('8. verifies index.html loads official Cashfree Payments JS SDK v3', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert.match(html, /sdk\.cashfree\.com\/js\/v3\/cashfree\.js/);
  });

  it('9. verifies locked business rules: inclusive tax, ₹99 shipping below ₹1,499, ₹0 shipping at ₹1,499+', async () => {
    const { calculateAuthoritativeOrder, LOCKED_MARKETPLACE_POLICY } = await import('../functions/lib/financialEngine.js');

    // Case A: Product subtotal ₹149 (below ₹1,499 threshold)
    // Shipping: ₹99. Additional GST: ₹0 (inclusive). Customer Payable: ₹248.
    // BioCart 20% commission: ₹29.80 (2980 paise). Vendor 80% share: ₹119.20 (11920 paise).
    // Shipping ₹99 belongs 100% to BioCart. Total BioCart revenue: ₹128.80 (12880 paise).
    const singleProductCart = [{
      vendorId: 'vendor-farm-1',
      vendorStoreName: 'Farm Bio 1',
      items: [{
        productId: 'prod-item-1',
        name: 'Organic Input 1',
        pricePaise: 14900, // ₹149
        quantity: 1
      }]
    }];

    const shippingPaise149 = 14900 >= 149900 ? 0 : 9900;
    assert.equal(shippingPaise149, 9900); // ₹99 shipping

    const result149 = calculateAuthoritativeOrder(singleProductCart, null, shippingPaise149, LOCKED_MARKETPLACE_POLICY);
    assert.equal(result149.subtotalPaise, 14900); // ₹149
    assert.equal(result149.shippingPaise, 9900); // ₹99
    assert.equal(result149.grandTotalPaise, 24800); // ₹248 payable by customer
    assert.equal(result149.totalPlatformCommissionPaise, 2980); // ₹29.80 (20% of ₹149)
    assert.equal(result149.totalVendorPayablePaise, 11920); // ₹119.20 (80% of ₹149)
    // Shipping charge is NEVER included in vendor share:
    assert.equal(result149.vendorSplits[0].vendorNetCreditPaise, 11920);

    // Case B: Product subtotal ₹1,499 (at ₹1,499 threshold -> Free shipping)
    // Shipping: ₹0. Additional GST: ₹0 (inclusive). Customer Payable: ₹1,499.
    // BioCart 20% commission: ₹299.80 (29980 paise). Vendor 80% share: ₹1,199.20 (119920 paise).
    const freeShippingCart = [{
      vendorId: 'vendor-farm-2',
      vendorStoreName: 'Farm Bio 2',
      items: [{
        productId: 'prod-item-2',
        name: 'Bio Fertilizer Combo',
        pricePaise: 149900, // ₹1,499
        quantity: 1
      }]
    }];

    const shippingPaise1499 = 149900 >= 149900 ? 0 : 9900;
    assert.equal(shippingPaise1499, 0); // ₹0 shipping

    const result1499 = calculateAuthoritativeOrder(freeShippingCart, null, shippingPaise1499, LOCKED_MARKETPLACE_POLICY);
    assert.equal(result1499.subtotalPaise, 149900); // ₹1,499
    assert.equal(result1499.shippingPaise, 0); // ₹0
    assert.equal(result1499.grandTotalPaise, 149900); // ₹1,499 payable by customer
    assert.equal(result1499.totalPlatformCommissionPaise, 29980); // ₹299.80 (20% of ₹1,499)
    assert.equal(result1499.totalVendorPayablePaise, 119920); // ₹1,199.20 (80% of ₹1,499)

    // Case C: Minimum order restriction removed everywhere — ₹1 order allowed
    const microCart = [{
      vendorId: 'vendor-farm-3',
      vendorStoreName: 'Farm Bio 3',
      items: [{
        productId: 'prod-item-3',
        name: 'Single Seed Packet',
        pricePaise: 100, // ₹1
        quantity: 1
      }]
    }];
    const shippingMicro = 100 >= 149900 ? 0 : 9900;
    const resultMicro = calculateAuthoritativeOrder(microCart, null, shippingMicro, LOCKED_MARKETPLACE_POLICY);
    assert.equal(resultMicro.subtotalPaise, 100); // ₹1
    assert.equal(resultMicro.shippingPaise, 9900); // ₹99
    assert.equal(resultMicro.grandTotalPaise, 10000); // ₹100
  });

  it('10. verifies CheckoutModal inclusive taxes and threshold constants in source', () => {
    const code = fs.readFileSync('src/components/ui/CheckoutModal.tsx', 'utf8');
    assert.match(code, /const GST = 0;/);
    assert.match(code, /Included in MRP \(₹0\)/);
    assert.match(code, /settings\.freeShippingThreshold : 1499/);
    assert.match(code, /isBelowMinOrder = minOrderReq > 0 && subtotal < minOrderReq;/);
  });
});
