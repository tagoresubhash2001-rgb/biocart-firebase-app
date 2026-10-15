import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { usePageCMS } from '../hooks/usePageCMS';
import { 
  Building, Landmark, Calculator, FileText, CheckSquare, 
  ArrowRight, ShieldCheck, MapPin, Truck, HelpCircle, AlertCircle
} from 'lucide-react';

// DEALER PORTAL COMPONENT
export const DealerPortal: React.FC = () => {
  const { user, addToast } = useApp();
  const { cmsData } = usePageCMS('dealer-portal');
  const [targetUnits, setTargetUnits] = useState<number>(1000);
  const [productType, setProductType] = useState<string>('coir_pots');
  const [nurseryLocation, setNurseryLocation] = useState<string>('');

  // Special Dealer prices
  const dealerPrices: Record<string, { name: string; base: number; discount: number }> = {
    coir_pots: { name: 'High-Density Coir Pots (Pack of 12)', base: 450, discount: 260 },
    peat_blocks: { name: 'Triple-Washed Coco Peat Block (5Kg)', base: 350, discount: 195 },
    grow_bags: { name: 'Breathable Jute Grow Bags (Set of 5)', base: 590, discount: 340 }
  };

  const selected = dealerPrices[productType];
  const totalPrice = selected.discount * (targetUnits / 10); // Pack of 10-12 equivalents

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseryLocation) {
      addToast('Please confirm your registered nursery location.', 'error');
      return;
    }
    addToast(`Dealer inquiry for ${targetUnits} units of ${selected.name} logged. Our dispatch center will issue a commercial invoice.`, 'success');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-12 sm:pt-32 sm:pb-16 space-y-12 animate-fade-in" id="dealer-portal">
      {/* Portal Header */}
      <div className="space-y-4 text-center max-w-2xl mx-auto">
        <div className="p-3 bg-nature-50 dark:bg-nature-950/40 text-nature-700 w-fit mx-auto rounded-full border border-nature-100">
          <Building className="w-6 h-6" />
        </div>
        <h1 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400">
          {cmsData?.heroTitle ? <span dangerouslySetInnerHTML={{ __html: cmsData.heroTitle }} /> : 'Regional Dealer Desk'}
        </h1>
        <p className="text-xs md:text-sm text-charcoal-500 leading-relaxed">
          {cmsData?.heroSubtitle ? cmsData.heroSubtitle : 'Access factory direct bulk catalogs, configure regional nursery allocations, and log custom sizing orders for Sindulis coir products.'}
        </p>
      </div>

      {/* Grid: Prices & Dynamic Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-32px items-start">
        {/* Special dealer pricings list */}
        <div className="lg:col-span-5 bg-white dark:bg-charcoal-900 p-6 rounded-3xl border border-slate-150 dark:border-white/5 space-y-6">
          <h3 className="font-display font-bold text-base text-nature-900 dark:text-nature-400 border-b border-slate-50 pb-2">
            Active Dealer Contract Rates (2026)
          </h3>
          <div className="space-y-4" id="dealer-rates-list">
            {Object.entries(dealerPrices).map(([key, item]) => (
              <div key={key} className="p-4 bg-slate-50 dark:bg-charcoal-950 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-white/5">
                <div className="space-y-1 max-w-[70%]">
                  <span className="font-bold text-xs text-charcoal-900 dark:text-white">{item.name}</span>
                  <p className="text-[10px] text-charcoal-400">Regular MSRP: ₹{item.base}</p>
                </div>
                <div className="text-right">
                  <span className="text-nature-700 dark:text-nature-450 font-extrabold text-sm block">₹{item.discount}</span>
                  <p className="text-[9px] text-nature-600 font-bold bg-nature-50 dark:bg-nature-950 px-1.5 py-0.5 rounded">Save {Math.round((1 - item.discount / item.base) * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 rounded-2xl text-[11px] leading-relaxed flex gap-2">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
            <span>Minimum order quantities (MOQ) of 100 units apply for dealer pricing contracts.</span>
          </div>
        </div>

        {/* Dynamic bulk calculator and reservation */}
        <div className="lg:col-span-7 bg-white dark:bg-charcoal-900 p-8 rounded-3xl border border-slate-150 dark:border-white/5 shadow-md">
          <h3 className="font-serif font-bold text-xl text-nature-900 dark:text-nature-400 mb-6 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-nature-700" />
            <span>Dealer Pricing & Order Simulator</span>
          </h3>

          <form onSubmit={handleOrderSubmit} className="space-y-6" id="dealer-calculator-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-16px">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Target Coir Element</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none text-xs text-charcoal-600 dark:text-slate-300 font-bold cursor-pointer"
                >
                  <option value="coir_pots">High-Density Coir Pots</option>
                  <option value="peat_blocks">Triple-Washed Coco Peat</option>
                  <option value="grow_bags">Breathable Jute Grow Bags</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Target Units MOQ (min 100)</label>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={targetUnits}
                  onChange={(e) => setTargetUnits(Math.max(100, parseInt(e.target.value) || 100))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none text-xs text-charcoal-950 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Registered Nursery/Retailer Physical Address</label>
              <input
                type="text"
                required
                placeholder="e.g. Andhra Botanics Hub, Near Ring Road, Vijayawada"
                value={nurseryLocation}
                onChange={(e) => setNurseryLocation(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none text-xs text-charcoal-950 dark:text-white"
              />
            </div>

            {/* Calculations Summary Card */}
            <div className="p-6 bg-nature-50/50 dark:bg-charcoal-950 rounded-2xl border border-nature-100/30 dark:border-white/5 grid grid-cols-2 gap-16px">
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-400">Standard Estimated MSRP</span>
                <p className="font-display font-extrabold text-base text-charcoal-600 dark:text-slate-400 line-through">₹{(selected.base * (targetUnits / 10)).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-nature-700">Contract Dealer Price</span>
                <p className="font-display font-extrabold text-xl text-nature-700 dark:text-nature-400">₹{totalPrice.toLocaleString()}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200 dark:border-white/5 pt-3">
                <p className="text-[10px] text-charcoal-500 leading-relaxed font-semibold">
                  * Pricing quote factors in low EC wash premium and high density coir parameters. Direct container shipping from our main processing plant is inclusive within regional transport limits.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-4 bg-nature-700 hover:bg-nature-800 text-white rounded-xl text-xs font-bold shadow-md transition-all w-full cursor-pointer flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-nature-700/30"
            >
              <span>Transmit Commercial Invoice Request</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};


// DISTRIBUTOR PORTAL COMPONENT
export const DistributorPortal: React.FC = () => {
  const { addToast } = useApp();
  const [containerCount, setContainerCount] = useState<number>(1);
  const [exportDestination, setExportDestination] = useState<string>('NL_ROT');
  const [requiresPhytoCertificate, setRequiresPhytoCertificate] = useState<boolean>(true);

  const destinations: Record<string, { name: string; portFee: number; timeDays: number }> = {
    NL_ROT: { name: 'Port of Rotterdam, Netherlands (Europe)', portFee: 185000, timeDays: 28 },
    US_LA: { name: 'Port of Los Angeles, USA', portFee: 245000, timeDays: 32 },
    AE_JEB: { name: 'Port of Jebel Ali, Dubai (UAE)', portFee: 110000, timeDays: 12 },
    SG_SIN: { name: 'Port of Singapore', portFee: 95000, timeDays: 8 }
  };

  const selectedDest = destinations[exportDestination];
  const cargoFreightTotal = containerCount * selectedDest.portFee;

  const handleContainerBooking = (e: React.FormEvent) => {
    e.preventDefault();
    addToast(`Distributor export inquiry logged for ${containerCount}x FCL Container bound for ${selectedDest.name}. Director Tagore Subhash Maguluri will dispatch the technical export prospectus.`, 'success');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-12 sm:pt-32 sm:pb-16 space-y-12 animate-fade-in" id="distributor-portal">
      {/* Portal Header */}
      <div className="space-y-4 text-center max-w-2xl mx-auto">
        <div className="p-3 bg-nature-50 dark:bg-nature-950/40 text-nature-700 w-fit mx-auto rounded-full border border-nature-100">
          <Landmark className="w-6 h-6" />
        </div>
        <h1 className="font-serif font-bold text-3xl md:text-4xl text-nature-900 dark:text-nature-400">
          Global Distributor Terminal
        </h1>
        <p className="text-xs md:text-sm text-charcoal-500 leading-relaxed">
          Access high-volume container freight calculators, track phytosanitary testing certificates, and manage global agricultural supply chains directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-32px items-start">
        {/* Left Column: Custom documentation checklist */}
        <div className="lg:col-span-5 bg-white dark:bg-charcoal-900 p-6 rounded-3xl border border-slate-150 dark:border-white/5 space-y-6">
          <h3 className="font-display font-bold text-base text-nature-900 dark:text-nature-400 border-b border-slate-50 pb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-nature-700" />
            <span>Required Export Documents</span>
          </h3>
          
          <div className="space-y-4" id="export-docs-checklist">
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-nature-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-charcoal-950 dark:text-white">Phytosanitary Certification</h5>
                <p className="text-[10px] text-charcoal-400 mt-0.5">Mandatory agricultural weed-free and pathogen-free test certified by authorized government laboratories.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-nature-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-charcoal-950 dark:text-white">Certificate of Origin (COO)</h5>
                <p className="text-[10px] text-charcoal-400 mt-0.5">Authentic agricultural origin document stamped by national export authorities.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-nature-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-charcoal-950 dark:text-white">Low EC Verification Records</h5>
                <p className="text-[10px] text-charcoal-400 mt-0.5">Batch testing parameters ensuring EC levels &lt; 0.5 mS/cm matching strict European parameters.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Global Container Calculator */}
        <div className="lg:col-span-7 bg-white dark:bg-charcoal-900 p-8 rounded-3xl border border-slate-150 dark:border-white/5 shadow-md">
          <h3 className="font-serif font-bold text-xl text-nature-900 dark:text-nature-400 mb-6 flex items-center gap-2">
            <Truck className="w-5 h-5 text-nature-700" />
            <span>FCL Freight Quote Calculator</span>
          </h3>

          <form onSubmit={handleContainerBooking} className="space-y-6" id="distributor-freight-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-16px">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Destination Sea Port</label>
                <select
                  value={exportDestination}
                  onChange={(e) => setExportDestination(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none text-xs text-charcoal-600 dark:text-slate-300 font-bold cursor-pointer"
                >
                  <option value="NL_ROT">Rotterdam, NL (Rotterdam Port)</option>
                  <option value="US_LA">Los Angeles, US (LAX Marine)</option>
                  <option value="AE_JEB">Dubai, AE (Jebel Ali Terminal)</option>
                  <option value="SG_SIN">Singapore, SG (PSA Singapore)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">Container Volume (40ft High-Cube FCL)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={containerCount}
                  onChange={(e) => setContainerCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none text-xs text-charcoal-950 dark:text-white font-bold"
                />
              </div>
            </div>

            {/* Checklist trigger */}
            <div className="flex items-center gap-2" id="phyto-checkbox">
              <input
                type="checkbox"
                id="phyto-cert"
                checked={requiresPhytoCertificate}
                onChange={(e) => setRequiresPhytoCertificate(e.target.checked)}
                className="w-4 h-4 text-nature-700 focus:ring-nature-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="phyto-cert" className="text-xs text-charcoal-600 dark:text-slate-300 select-none cursor-pointer font-medium">
                Include Phytosanitary & Customs Clearance Handling Services
              </label>
            </div>

            {/* Price Cards and info */}
            <div className="p-6 bg-slate-50/50 dark:bg-charcoal-950 rounded-2xl border border-slate-200 dark:border-white/5 grid grid-cols-2 gap-16px">
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-400">Estimated Port Transit</span>
                <p className="font-display font-extrabold text-base text-charcoal-800 dark:text-slate-200">~{selectedDest.timeDays} Ocean Days</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-nature-700">Estimated Port FOB Quote</span>
                <p className="font-display font-extrabold text-xl text-nature-700 dark:text-nature-450">₹{cargoFreightTotal.toLocaleString()}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200 dark:border-white/5 pt-3 text-[10px] text-charcoal-500 leading-relaxed font-semibold">
                * Ocean freight estimates exclude dynamic terminal container charges. Freight routes origin from Chennai or Krishnapatnam ports. Managed with precision by Director Tagore Subhash Maguluri.
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-4 bg-nature-700 hover:bg-nature-800 text-white rounded-xl text-xs font-bold shadow-md transition-all w-full cursor-pointer flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-nature-700/30"
            >
              <span>Request Pro-Forma Invoice & Technical Specs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};


// 404 PAGE COMPONENT
export const NotFoundPage: React.FC = () => {
  const { setTab } = useApp();

  return (
    <div className="max-w-md mx-auto px-6 pt-32 pb-24 text-center space-y-6 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in" id="404-page">
      <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-full w-fit">
        <AlertCircle className="w-12 h-12" />
      </div>

      <div className="space-y-2">
        <h1 className="font-serif font-extrabold text-4xl text-nature-900 dark:text-nature-400">
          Element 404
        </h1>
        <p className="text-xs md:text-sm text-charcoal-500 leading-relaxed">
          The requested organic path does not exist. It has decomposed or has been recycled back into the natural soil ecosystem.
        </p>
      </div>

      <button
        onClick={() => setTab('home')}
        className="px-6 py-3 bg-nature-700 hover:bg-nature-800 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-nature-700/30"
      >
        <span>Return to Safe Ground</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
