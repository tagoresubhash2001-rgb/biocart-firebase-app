import React from 'react';
import { BioCartLogo } from '../ui/BioCartLogo';
import { Printer, X, Download } from 'lucide-react';

export interface PackingSlipProps {
  orderNumber: string;
  orderDate?: string | any;
  invoiceNumber?: string;
  vendor: {
    storeName: string;
    businessName?: string;
    ownerName?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    address?: string;
  };
  customer: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items: {
    productId?: string;
    name: string;
    sku?: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  financials: {
    subtotal: number;
    discount?: number;
    tax?: number;
    shippingFee?: number;
    totalPayable: number;
    paymentMethod?: string;
    paymentStatus?: string;
  };
  awbNumber?: string | null;
  onClose?: () => void;
}

export const VendorPackingSlipModal: React.FC<PackingSlipProps> = ({
  orderNumber,
  orderDate,
  invoiceNumber,
  vendor,
  customer,
  items,
  financials,
  awbNumber,
  onClose,
}) => {
  const formattedDate = orderDate?.seconds
    ? new Date(orderDate.seconds * 1000).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : orderDate
    ? new Date(orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Container Card */}
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 print:my-0 print:shadow-none print:border-none print:max-w-none print:w-full">
        
        {/* Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
              BioCart Official Packing Slip
            </span>
            <span className="text-xs font-mono text-slate-500 font-semibold">{orderNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Slip</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* PRINTABLE SLIP CONTENT */}
        <div 
          id="printable-packing-slip" 
          className="relative p-8 md:p-12 text-slate-800 font-sans print:p-6 print:m-0"
          style={{ minHeight: '800px' }}
        >
          {/* Subtle Transparent BioCart Logo Watermark */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none"
            aria-hidden="true"
          >
            <img
              src="/assets/biocart_logo_official.png"
              alt=""
              className="w-[440px] opacity-[0.045] filter grayscale contrast-125 transform -rotate-12"
            />
          </div>

          <div className="relative z-10 space-y-6">
            
            {/* Top Bar: BioCart Brand & Official Details */}
            <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-emerald-900/20 pb-6">
              <div className="space-y-2">
                <BioCartLogo size="md" />
                <p className="text-[11px] text-slate-500 font-medium max-w-xs leading-relaxed">
                  Certified Ecological Multi-Vendor Marketplace • Circular Agriculture
                </p>
                <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                  <p>Operating Entity: Sindulis Agro Products Pvt. Ltd.</p>
                  <p>CIN: U01110AP2023PTC123456 • GSTIN: 36AABCS1429B1Z8</p>
                  <p>HQ: Industrial Corridor Area, Guntur, AP - 522001</p>
                  <p>Portal: https://biocart.in • Care: care@biocart.co.in</p>
                </div>
              </div>

              {/* Order Meta Box */}
              <div className="text-right space-y-1.5">
                <div className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md">
                  Merchant Packing Slip
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                  {orderNumber}
                </div>
                <div className="text-xs text-slate-500">
                  Date: <strong className="text-slate-800">{formattedDate}</strong>
                </div>
                {invoiceNumber && (
                  <div className="text-xs text-slate-500 font-mono">
                    Invoice: <strong className="text-slate-800">{invoiceNumber}</strong>
                  </div>
                )}
                {awbNumber && (
                  <div className="text-xs text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block mt-1">
                    Delhivery AWB: {awbNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Two-Column Dispatch Information: Vendor (Sender) & Customer (Recipient) */}
            <div className="grid grid-cols-2 gap-8 text-xs pt-2">
              {/* Vendor Section */}
              <div className="p-4 bg-stone-50/70 border border-stone-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-stone-200/60 pb-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase text-slate-500">
                    Dispatched By (Vendor Partner)
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900">
                    {vendor.storeName || vendor.businessName || 'BioCart Verified Partner'}
                  </h4>
                  {vendor.ownerName && (
                    <p className="text-slate-600">Attn: {vendor.ownerName}</p>
                  )}
                  {vendor.address && (
                    <p className="text-slate-600 leading-relaxed">{vendor.address}</p>
                  )}
                  {vendor.phone && (
                    <p className="text-slate-600 font-mono">Phone: {vendor.phone}</p>
                  )}
                  {vendor.email && (
                    <p className="text-slate-600">Email: {vendor.email}</p>
                  )}
                  {vendor.gstin && (
                    <p className="text-slate-500 font-mono text-[11px]">GSTIN: {vendor.gstin}</p>
                  )}
                </div>
              </div>

              {/* Customer Section */}
              <div className="p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase text-emerald-800">
                    Deliver To (Customer Recipient)
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900">
                    {customer.name}
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    {customer.street}
                  </p>
                  <p className="font-semibold text-slate-900">
                    {customer.city}, {customer.state} — {customer.postalCode}
                  </p>
                  <p className="text-slate-700 font-mono">
                    Phone: {customer.phone}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Country: {customer.country || 'India'}
                  </p>
                </div>
              </div>
            </div>

            {/* Vendor Specific Line Items Table */}
            <div className="pt-2">
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Product Description</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3 text-right">Unit Price (₹)</th>
                      <th className="p-3 text-right">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-900">{it.name}</p>
                          {it.sku && (
                            <p className="text-[10px] font-mono text-slate-400">SKU: {it.sku}</p>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">{it.quantity}</td>
                        <td className="p-3 text-right font-mono text-slate-700">₹{it.price?.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          ₹{it.total?.toFixed(2) || (it.price * it.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary & Payment Breakdown */}
            <div className="grid grid-cols-2 gap-8 pt-2 items-start text-xs">
              
              {/* Payment Details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-mono text-[10px] font-bold uppercase text-slate-500 block">
                  Payment Verification
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment Mode:</span>
                    <strong className="text-slate-800 uppercase font-mono">{financials.paymentMethod || 'Online Prepaid'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment Status:</span>
                    <strong className="text-emerald-700 uppercase font-mono">{financials.paymentStatus || 'Completed'}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-600">Packaging Type:</span>
                    <span className="text-slate-800">100% Biodegradable Box</span>
                  </div>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="space-y-2">
                <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal:</span>
                    <span className="font-mono">₹{financials.subtotal.toFixed(2)}</span>
                  </div>
                  {financials.discount !== undefined && financials.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Vendor/Coupon Discount:</span>
                      <span className="font-mono">-₹{financials.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {financials.tax !== undefined && financials.tax > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Applicable Taxes (GST):</span>
                      <span className="font-mono">₹{financials.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {financials.shippingFee !== undefined && (
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery / Handling:</span>
                      <span className="font-mono">
                        {financials.shippingFee === 0 ? 'FREE' : `₹${financials.shippingFee.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t-2 border-slate-200 text-sm font-bold text-slate-900">
                    <span>Total Amount:</span>
                    <span className="font-mono text-emerald-800">₹{financials.totalPayable.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quality & Environmental Assurance Declaration */}
            <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">
                🌿 BioCart 100% Plastic-Free & Organic Guarantee
              </p>
              <p className="leading-relaxed">
                This shipment was packed in an eco-certified processing hub using corrugated cartons, water-activated paper tape, and biodegradable coir protections. For any issues or quality claims, contact our agronomists at care@biocart.co.in or call +91 863 2244 556 quoting order number {orderNumber}.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
