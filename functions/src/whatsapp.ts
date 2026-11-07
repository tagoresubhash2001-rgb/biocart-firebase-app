/**
 * WhatsApp order-confirmation message (R8) via the Meta WhatsApp Cloud API.
 * OFF by default: requires settings/notifications.whatsappEnabled == true plus the
 * WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment values and an approved
 * template named `order_confirmed` (body variables: {{1}} name, {{2}} order id, {{3}} amount).
 * Exactly one message per order (notification_events/{orderId}_order_confirmed).
 */
import { db, nowIso, rupees } from './core';

export async function sendOrderConfirmedWhatsApp(orderId: string) {
  const evRef = db().collection('notification_events').doc(`${orderId}_order_confirmed`);
  const settings = (await db().collection('settings').doc('notifications').get()).data() || {};
  const token = (process.env.WHATSAPP_TOKEN || '').trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  if (settings.whatsappEnabled !== true || !token || !phoneId) {
    await evRef.set({ status: 'skipped_disabled', updatedAt: nowIso() }, { merge: true });
    return;
  }
  const claimed = await db().runTransaction(async (t) => {
    const ev = await t.get(evRef);
    if (ev.exists && ['sent', 'sending'].includes(ev.data()!.status)) return false;
    t.set(evRef, { status: 'sending', updatedAt: nowIso() }, { merge: true });
    return true;
  });
  if (!claimed) return;
  const order = (await db().collection('orders').doc(orderId).get()).data();
  const phone = String(order?.shippingAddress?.phone || '');
  if (!order || !/^[6-9]\d{9}$/.test(phone)) { await evRef.set({ status: 'failed', error: 'no valid delivery phone' }, { merge: true }); return; }
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: `91${phone}`, type: 'template',
      template: {
        name: settings.whatsappTemplate || 'order_confirmed', language: { code: settings.whatsappLanguage || 'en' },
        components: [{ type: 'body', parameters: [
          { type: 'text', text: String(order.shippingAddress?.name || 'Customer').slice(0, 60) },
          { type: 'text', text: orderId },
          { type: 'text', text: `₹${rupees(order.totalAmountPaise || 0)}` },
        ] }],
      },
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  await evRef.set(res.ok
    ? { status: 'sent', providerMessageId: body?.messages?.[0]?.id || null, sentAt: nowIso() }
    : { status: 'failed', error: JSON.stringify(body).slice(0, 300), updatedAt: nowIso() }, { merge: true });
}
