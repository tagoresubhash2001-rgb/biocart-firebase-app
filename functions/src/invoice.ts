/**
 * Order Confirmation / Bill of Supply PDF (R8, R9) — generated only after the order is
 * confirmed (payment verified or COD confirmed). Also sends the optional WhatsApp
 * order-confirmation message (switched off until a Meta WhatsApp token exists).
 */
import { getStorage } from 'firebase-admin/storage';
import * as crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import { db, nowIso, rupees } from './core';
import { sendOrderConfirmedWhatsApp } from './whatsapp';

const BUSINESS = {
  legalName: 'SINDULIS INNOVATIVE SOLUTIONS',
  unit: 'BioCart',
  udyam: 'UDYAM-AP-23-0104910',
  address: 'D.No. 21-4-28, Amarasudha Nilayam, Shiv Jyoti Nagar, near Govinda, Tirupati, Andhra Pradesh – 517507',
  phone: '+91 9494080479',
  email: 'biocart.2025@gmail.com',
};

const inr = (paise: number) => `Rs. ${rupees(paise).toFixed(2)}`;

export function renderConfirmationPdf(order: any, subOrders: any[], vendors: Record<string, any>, gstin: string | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new (PDFDocument as any)({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const title = gstin ? 'TAX INVOICE' : 'ORDER CONFIRMATION / BILL OF SUPPLY';
    doc.font('Helvetica-Bold').fontSize(16).text(title, { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(11).text(`${BUSINESS.legalName} (${BUSINESS.unit})`, { align: 'center' });
    doc.font('Helvetica').fontSize(8.5)
      .text(BUSINESS.address, { align: 'center' })
      .text(`Udyam: ${BUSINESS.udyam}${gstin ? ` | GSTIN: ${gstin}` : ''} | ${BUSINESS.phone} | ${BUSINESS.email}`, { align: 'center' });
    if (!gstin) doc.text('Prices are inclusive of applicable taxes. BioCart is not registered under GST; no GST is charged on this document.', { align: 'center' });
    doc.moveDown();

    const confirmed = order.financialsAllocatedAt || nowIso();
    doc.fontSize(10)
      .text(`Order number: ${order.orderNumber || order.id}`)
      .text(`Document number: ${order.invoiceNumber || order.id}`)
      .text(`Confirmed on: ${new Date(confirmed).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`)
      .text(`Payment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online (Cashfree)'}${order.paymentReference ? ` — ref ${order.paymentReference}` : ''}`);
    doc.moveDown(0.6);
    const a = order.shippingAddress || {};
    doc.font('Helvetica-Bold').text('Deliver to:').font('Helvetica')
      .text(`${a.name || ''}, ${a.phone || ''}`).text(`${a.address || ''}`).text(`${a.city || ''}, ${a.state || ''} – ${a.zip || ''}`);
    if (order.customerGstin) doc.text(`Customer GSTIN: ${order.customerGstin} ${order.customerBusinessName ? '(' + order.customerBusinessName + ')' : ''}`);
    doc.moveDown();

    for (const so of subOrders) {
      const v = vendors[so.vendorId] || {};
      doc.font('Helvetica-Bold').fontSize(10).text(`Sold by: ${v.storeName || v.businessName || so.vendorStoreName || so.vendorId}`);
      doc.font('Helvetica').fontSize(8.5);
      if (v.legal?.gstin && v.legal?.gstinVerified !== false) doc.text(`Seller GSTIN: ${v.legal.gstin}`);
      (so.items || []).forEach((it: any, i: number) => {
        doc.text(`${i + 1}. ${it.name}   Qty ${it.quantity} × Rs. ${Number(it.price).toFixed(2)} = Rs. ${(Number(it.price) * it.quantity).toFixed(2)}`);
      });
      doc.moveDown(0.5);
    }
    doc.fontSize(10)
      .text(`Item total: ${inr(order.subtotalPaise || 0)}`, { align: 'right' })
      .text(`Discount${order.couponCode ? ` (${order.couponCode})` : ''}: -${inr(order.discountAmountPaise || 0)}`, { align: 'right' })
      .text(`Shipping: ${order.shippingAmountPaise ? inr(order.shippingAmountPaise) : 'FREE'}`, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(12).text(`${order.paymentMethod === 'cod' ? 'Amount payable on delivery' : 'Amount paid'}: ${inr(order.totalAmountPaise || 0)}`, { align: 'right' });
    doc.moveDown(2);
    doc.font('Helvetica').fontSize(7.5).text('Computer-generated document; no signature required. For help: ' + BUSINESS.phone, { align: 'center' });
    doc.end();
  });
}

/** Called right after an order is confirmed (payment verified / COD confirmed). Never throws. */
export async function generateOrderConfirmation(orderId: string) {
  const ref = db().collection('orders').doc(orderId);
  const after = (await ref.get()).data();
  if (!after || after.financialsAllocated !== true || after.pdfUrl) return;
  const subsSnap = await ref.collection('vendor_orders').get();
  const subs = subsSnap.docs.map((d) => ({ vendorId: d.id, ...d.data() }));
  const vDocs = subs.length ? await db().getAll(...subs.map((s) => db().collection('vendors').doc(s.vendorId))) : [];
  const vendors = Object.fromEntries(vDocs.map((d) => [d.id, d.data() || {}]));
  const biz = (await db().collection('settings').doc('business').get()).data() || {};
  const gstin = typeof biz.gstin === 'string' && /^[0-9A-Z]{15}$/.test(biz.gstin) ? biz.gstin : null;
  try {
    const pdf = await renderConfirmationPdf({ ...after, id: orderId }, subs, vendors, gstin);
    const bucket = getStorage().bucket();
    const path = `invoices/${after.userId}/${orderId}.pdf`;
    const token = crypto.randomUUID();
    await bucket.file(path).save(pdf, { resumable: false, metadata: { contentType: 'application/pdf', metadata: { firebaseStorageDownloadTokens: token } } });
    const pdfUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    await ref.update({ pdfUrl, invoiceUrl: pdfUrl, pdfPath: path, pdfGeneratedAt: nowIso() });
  } catch (e: any) {
    console.error(`[invoice] ${orderId} PDF failed`, e?.message);
    await ref.update({ pdfError: String(e?.message || e).slice(0, 200) }).catch(() => undefined);
  }
  await sendOrderConfirmedWhatsApp(orderId).catch((e) => console.warn('[whatsapp]', e?.message));
}
