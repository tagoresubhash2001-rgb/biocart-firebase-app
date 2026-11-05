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
});
