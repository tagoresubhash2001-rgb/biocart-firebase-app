import React, { useState, useEffect } from 'react';
import { usePageCMS } from '../hooks/usePageCMS';
import { INITIAL_CMS_PAGES } from '../data/initialCMSPages';
import { PageSection, CMSPage } from '../types/cms';
import { 
  ChevronDown, ChevronUp, CheckCircle, ArrowRight, 
  Sparkles, ShieldCheck, Leaf, Star, HelpCircle, Mail, AlertCircle,
  Phone, MapPin, Send, Building, Clock, MessageSquare, Award, CheckCircle2,
  Users, UserCheck, Package, Truck, Search, Shield, User, ExternalLink, Check, Calendar, Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdminService } from '../services/AdminService';
import { db } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { BioCartLoader } from '../components/ui/BioCartLoader';

interface GenericCMSPageProps {
  pageId: string;
}

// Interactive Contact Form Component for CMS-rendered Contact Pages
const ContactFormBlock: React.FC<{ sectionData?: any }> = ({ sectionData }) => {
  const { addToast } = useApp();
  const [formType, setFormType] = useState<'general' | 'dealer' | 'distributor'>('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [volumeEstimate, setVolumeEstimate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
      addToast('Please complete all mandatory required fields.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await AdminService.submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
        type: formType,
        companyName: companyName.trim(),
        city: city.trim(),
        volumeEstimate
      });
      addToast('Thank you! Your message has been recorded. Our team will reach out promptly.', 'success');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setCompanyName('');
      setCity('');
      setVolumeEstimate('');
    } catch (err: any) {
      console.error(err);
      addToast('Submission failed. Please check connection and try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-sm">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit mb-6">
        <button
          type="button"
          onClick={() => setFormType('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            formType === 'general' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          General Inquiry
        </button>
        <button
          type="button"
          onClick={() => setFormType('dealer')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            formType === 'dealer' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Dealer Application
        </button>
        <button
          type="button"
          onClick={() => setFormType('distributor')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            formType === 'distributor' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Bulk Trade / Export
        </button>
      </div>

      <h3 className="text-2xl font-bold text-slate-900 mb-2">
        {formType === 'general' && (sectionData?.title || 'Send us a Message')}
        {formType === 'dealer' && 'Apply for Regional Dealer Rights'}
        {formType === 'distributor' && 'Initiate Bulk Distributor Sourcing'}
      </h3>
      <p className="text-xs text-slate-500 mb-8">
        {sectionData?.subtitle || 'All communications are processed directly by BioCart agronomists and logistics directors.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Subhash Maguluri"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@domain.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 99887 76655"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location / City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Hyderabad / Guntur"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {formType !== 'general' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Nursery Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Business entity name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Scale / Volume</label>
              <select
                value={volumeEstimate}
                onChange={(e) => setVolumeEstimate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
              >
                <option value="">Select Scale</option>
                <option value="retail">Local Nursery (500 - 2,000 units/mo)</option>
                <option value="state">Regional Distributor (2,000 - 10,000 units/mo)</option>
                <option value="export">Commercial / Bulk Container Trade</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Message / Requirements *</label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your inquiry, logistics requirements or questions..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>{isSubmitting ? 'Transmitting Inquiries...' : 'Submit Message'}</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

// Interactive Order Tracking Component for 'track-active-order'
const OrderTrackerBlock: React.FC<{ sectionData?: any }> = ({ sectionData }) => {
  const { user, setAuthModalOpen, setTab, addToast } = useApp();
  const [orderQuery, setOrderQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryTerm = orderQuery.trim();
    if (!queryTerm) {
      addToast('Please enter your Order ID or Courier AWB number.', 'warning');
      return;
    }

    if (!user) {
      addToast('Please sign in to verify authorization to track this order.', 'info');
      setAuthModalOpen(true);
      return;
    }

    setIsLoading(true);
    setSearched(true);
    setErrorStatus(null);
    setOrderData(null);

    try {
      // 1. Direct document lookup by ID
      const orderRef = doc(db, 'orders', queryTerm);
      const snap = await getDoc(orderRef);

      if (snap.exists()) {
        const data = snap.data();
        // Zero-Trust verification: customer can only view their own orders; admin can view any
        if (data.userId === user.uid || user.role === 'admin' || user.role === 'super_admin') {
          setOrderData({ id: snap.id, ...data });
          setIsLoading(false);
          return;
        } else {
          setErrorStatus('unauthorized');
          setIsLoading(false);
          return;
        }
      }

      // 2. Lookup by orderNumber field
      const q = query(
        collection(db, 'orders'),
        where('orderNumber', '==', queryTerm)
      );
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const firstDoc = querySnap.docs[0];
        const data = firstDoc.data();
        if (data.userId === user.uid || user.role === 'admin' || user.role === 'super_admin') {
          setOrderData({ id: firstDoc.id, ...data });
          setIsLoading(false);
          return;
        } else {
          setErrorStatus('unauthorized');
          setIsLoading(false);
          return;
        }
      }

      // Not found
      setErrorStatus('not_found');
    } catch (err: any) {
      console.error('Error tracking order:', err);
      setErrorStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'processing', label: 'Processing' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'delivered', label: 'Delivered' }
  ];

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const statusOrder = ['placed', 'processing', 'dispatched', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus?.toLowerCase() || 'placed');
    const stepIndex = statusOrder.indexOf(stepKey);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-4xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-sm">
      <div className="max-w-xl mx-auto text-center space-y-3 mb-8">
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
          <Truck className="w-6 h-6" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">
          {sectionData?.title || 'Live Order Tracking'}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {sectionData?.subtitle || 'Enter your 10-digit BioCart Order Number to monitor real-time packing, transit, and door-delivery milestones.'}
        </p>
      </div>

      <form onSubmit={handleTrack} className="max-w-xl mx-auto mb-10">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <Package className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              required
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="e.g. ORD-2026-78492 or Firebase ID"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking...</span>
              </span>
            ) : (
              <>
                <span>Track Package</span>
                <Search className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        {!user && (
          <p className="text-[11px] text-slate-400 mt-2 text-center flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Customer verification required to protect delivery addresses.</span>
          </p>
        )}
      </form>

      {/* Result Display */}
      {searched && (
        <div className="max-w-2xl mx-auto border-t border-slate-100 pt-8">
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Retrieving transit telemetry from carrier network...</p>
            </div>
          )}

          {!isLoading && errorStatus === 'unauthorized' && (
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-3">
              <Shield className="w-8 h-8 text-amber-600 mx-auto" />
              <h4 className="font-bold text-sm text-amber-900">Protected Order Record</h4>
              <p className="text-xs text-amber-700 max-w-md mx-auto">
                This order is registered under a different customer profile. For privacy and safety, only the ordering account can view live delivery telemetry.
              </p>
            </div>
          )}

          {!isLoading && errorStatus === 'not_found' && (
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900">Order ID Not Found</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  We could not find an active dispatch matching "{orderQuery}". All confirmed orders dispatch within 24–48 hours from our Andhra processing facility.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setTab('contact-us')}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  Contact Support Desk
                </button>
                <a
                  href="mailto:biocart.2025@gmail.com"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Care Desk</span>
                </a>
              </div>
            </div>
          )}

          {!isLoading && orderData && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shipment Status</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      Order #{orderData.orderNumber || orderData.id?.slice(0, 8)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      {orderData.status || 'Processing'}
                    </span>
                  </div>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Amount</span>
                  <p className="font-extrabold text-base text-emerald-700">₹{orderData.totalAmount || orderData.total || 0}</p>
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="py-6 px-4">
                <div className="relative flex items-center justify-between">
                  {/* Connecting Line */}
                  <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
                  {steps.map((st, sIdx) => {
                    const status = getStepStatus(st.key, orderData.status || 'placed');
                    return (
                      <div key={sIdx} className="relative z-10 flex flex-col items-center text-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            status === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : status === 'current'
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          }`}
                        >
                          {status === 'completed' ? <Check className="w-4 h-4" /> : sIdx + 1}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 mt-2">{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dispatch Details Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Courier Partner</span>
                  <p className="font-semibold text-slate-800">
                    {orderData.courier || orderData.shippingCarrier || 'BlueDart / Express Logistics'}
                  </p>
                  {orderData.awbNumber && (
                    <p className="text-[11px] text-emerald-700 font-mono">AWB: {orderData.awbNumber}</p>
                  )}
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Packaging Protocol</span>
                  <p className="font-semibold text-slate-800">100% Plastic-Free BioCart Box</p>
                  <p className="text-[10px] text-slate-500">Corrugated paper & water-activated starch tape</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Interactive Soil & Crop Consultation Form
const SoilConsultationBlock: React.FC<{ sectionData?: any }> = ({ sectionData }) => {
  const { addToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [growingEnvironment, setGrowingEnvironment] = useState('balcony_pots');
  const [cropType, setCropType] = useState('vegetables');
  const [soilType, setSoilType] = useState('coco_peat');
  const [problemDescription, setProblemDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !problemDescription.trim()) {
      addToast('Please complete all mandatory required fields.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await AdminService.submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: location.trim(),
        type: 'soil_consultation' as any,
        message: `[Soil & Crop Consultation Intake]
Growing Setup: ${growingEnvironment}
Crop/Plant Variety: ${cropType}
Current Substrate/Soil: ${soilType}
Description of Problem / Symptoms:
${problemDescription.trim()}`
      });

      addToast('Soil Consultation request logged! Our certified agronomist will review your parameters.', 'success');
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      addToast('Submission failed. Please check connection and try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">Consultation Request Confirmed</h3>
        <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
          Thank you, {name}. Our certified soil chemist and horticultural consultant has received your crop information. We will analyze your symptoms and reply with an organic remediation plan via WhatsApp / email within 12 business hours.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setProblemDescription('');
          }}
          className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
        >
          Submit Another Plant Consultation
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-sm">
      <div className="max-w-xl mx-auto text-center space-y-3 mb-8">
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
          <Leaf className="w-6 h-6" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">
          {sectionData?.title || 'Book Soil & Plant-Care Diagnostics'}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {sectionData?.subtitle || 'Submit detailed growing symptoms to receive personalized, zero-chemical botanical treatment protocols from BioCart agronomists.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sridhar Varma"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sridhar@gmail.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Phone *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98480 12345"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Farm / Garden City</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Vijayawada, AP"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Growing Setup</label>
            <select
              value={growingEnvironment}
              onChange={(e) => setGrowingEnvironment(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="balcony_pots">Balcony Pots & Planters</option>
              <option value="kitchen_garden">Kitchen Backyard Garden</option>
              <option value="terrace_farm">Terrace Polyhouse / Farm</option>
              <option value="commercial_farm">Commercial Farm (Open Field)</option>
              <option value="indoor_plants">Indoor Tropical Ornamentals</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Crop / Variety</label>
            <select
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="vegetables">Tomatoes, Chillies, Greens</option>
              <option value="fruit_trees">Citrus, Mango, Guava, Papaya</option>
              <option value="flowering_ornamentals">Roses, Jasmine, Hibiscus</option>
              <option value="microgreens">Microgreens & Herbs</option>
              <option value="commercial_cash_crop">Paddy, Cotton, Commercial</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Substrate / Soil</label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="coco_peat">Coco Peat & Coir Substrate</option>
              <option value="red_loam">Red Loamy Soil</option>
              <option value="black_cotton">Black Cotton Heavy Soil</option>
              <option value="sandy_soil">Sandy Soil / Coastal Sand</option>
              <option value="clay">Dense Clay Soil</option>
              <option value="unknown">Uncertain / Mixed Blend</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Describe Plant Symptoms or Soil Issues *
          </label>
          <textarea
            required
            rows={4}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Describe leaf discoloration (yellowing, brown tips), stunted root growth, white powder, pest attacks, or watering schedule..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>{isSubmitting ? 'Submitting Diagnostic Request...' : 'Submit Soil Consultation Request'}</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

// Interactive Dealer & Nursery Locator
const DealerLocatorBlock: React.FC<{ sectionData?: any }> = ({ sectionData }) => {
  const { setTab } = useApp();
  const [selectedState, setSelectedState] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const verifiedLocations = [
    {
      id: 'depot-1',
      name: 'Sindulis Central Processing Plant & Agro Depot',
      type: 'Headquarters & Primary Depot',
      address: 'Sindulis Agro Farms, Industrial Corridor, Tanuku, West Godavari District',
      state: 'Andhra Pradesh',
      pin: '534211',
      phone: '+91 9494080479',
      hours: 'Mon - Sat: 8:00 AM - 6:30 PM',
      services: ['Direct Pallet Sourcing', 'Raw Coir Bales', 'Low-EC Testing Lab']
    },
    {
      id: 'depot-2',
      name: 'Guntur Autonagar Distribution Terminal',
      type: 'Regional Distribution Hub',
      address: 'Plot 18, Commercial Agro Logistics Park, Autonagar, Guntur',
      state: 'Andhra Pradesh',
      pin: '517507',
      phone: '+91 863 2244 556',
      hours: 'Mon - Sat: 9:00 AM - 6:00 PM',
      services: ['Wholesale Nursery Plugs', 'Double-Screened Vermicompost']
    },
    {
      id: 'depot-3',
      name: 'Hyderabad Horticulture Clearing Depot',
      type: 'City Logistics Facility',
      address: 'Green Agro Complex, Near ORR Exit 14, Shamshabad, Hyderabad',
      state: 'Telangana',
      pin: '501218',
      phone: '+91 40 2988 4410',
      hours: 'Mon - Sat: 9:00 AM - 7:00 PM',
      services: ['Urban Balcony Kits', 'Same-Day City Dispatches']
    },
    {
      id: 'depot-4',
      name: 'Bengaluru Peenya Regional Logistics Center',
      type: 'Southern Regional Hub',
      address: 'Phase 2, Peenya Industrial Area, Bengaluru',
      state: 'Karnataka',
      pin: '560058',
      phone: '+91 80 4567 8900',
      hours: 'Mon - Fri: 9:00 AM - 6:00 PM',
      services: ['Coir Pots & Discs', 'Bio-Fungicides Stock']
    },
    {
      id: 'depot-5',
      name: 'Chennai Port Export & Coastal Depot',
      type: 'Coastal Transit Hub',
      address: 'SIDCO Industrial Estate, Ambattur, Chennai',
      state: 'Tamil Nadu',
      pin: '600058',
      phone: '+91 44 2625 3300',
      hours: 'Mon - Sat: 9:30 AM - 5:30 PM',
      services: ['Ocean Container Consolidation', 'Phytosanitary Inspected Stocks']
    }
  ];

  const filtered = verifiedLocations.filter((item) => {
    const matchesState = selectedState === 'All' || item.state === selectedState;
    const matchesSearch =
      !searchFilter.trim() ||
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.address.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.pin.includes(searchFilter.trim());
    return matchesState && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-sm space-y-8">
      <div className="max-w-xl mx-auto text-center space-y-3">
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">
          {sectionData?.title || 'Verified Distribution Points'}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {sectionData?.subtitle || 'Locate verified regional processing facilities, central depots, and partner distribution terminals carrying authentic BioCart growing mediums.'}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by city, district or PIN code..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
          />
        </div>
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="All">All Regions / States</option>
          <option value="Andhra Pradesh">Andhra Pradesh</option>
          <option value="Telangana">Telangana</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Tamil Nadu">Tamil Nadu</option>
        </select>
      </div>

      {/* Results Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {filtered.map((loc) => (
            <div key={loc.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                    {loc.type}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 mt-2">{loc.name}</h4>
                </div>
                <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>

              <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
                <p>{loc.address}</p>
                <p className="font-semibold text-slate-800">{loc.state} — PIN {loc.pin}</p>
                <p className="text-slate-500 flex items-center gap-1.5 pt-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{loc.phone}</span>
                </p>
                <p className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{loc.hours}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {loc.services.map((srv, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-600">
                    ✓ {srv}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900">No Offline Center in this Specific Query</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              BioCart guarantees pan-India direct doorstep dispatch within 3–5 days with free shipping on orders over ₹1,999.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTab('dealer-portal')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            Apply for Regional Dealership in this District
          </button>
        </div>
      )}
    </div>
  );
};

export const GenericCMSPage: React.FC<GenericCMSPageProps> = ({ pageId }) => {
  const { cmsData: remoteCms, loading } = usePageCMS(pageId);
  const { setTab, setSelectedCategory } = useApp();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Backward-compatibility redirect: If a visitor lands on a legacy category URL, seamlessly route to Shop
  useEffect(() => {
    const legacyCategoryMap: Record<string, string> = {
      'organic-fertilizers': 'Organic Fertilizers',
      'coir-potting-mix': 'Potting Mix',
      'potting-mix': 'Potting Mix',
      'plant-care-solutions': 'Plant Care',
      'plant-care': 'Plant Care',
      'organic-seeds': 'Seeds',
      'seeds': 'Seeds',
      'gardening-gear': 'Gardening Accessories',
      'gardening-accessories': 'Gardening Accessories',
      'healthy-living': 'Healthy Living'
    };

    const targetCategory = legacyCategoryMap[pageId] || legacyCategoryMap[pageId.replace(/^cat-/, '')];
    if (targetCategory) {
      setSelectedCategory(targetCategory);
      setTab('shop');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pageId, setSelectedCategory, setTab]);

  // Fallback to initial canonical seed page if Firestore document doesn't exist
  const initialFallback = INITIAL_CMS_PAGES.find(
    (p) => p.id === pageId || p.slug === pageId
  );

  const activePage: CMSPage | any = remoteCms || initialFallback;

  if (loading && !activePage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <BioCartLoader message="Loading content..." size="md" />
      </div>
    );
  }

  if (!activePage) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <HelpCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md">
          The requested content for "{pageId}" has not been published or configured yet.
        </p>
        <button
          onClick={() => { setTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
        >
          Return to Marketplace Home
        </button>
      </div>
    );
  }

  // Ensure unpublished drafts are NOT visible on the storefront
  if (activePage.status === 'draft') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 pt-32 pb-20 text-center">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{activePage.title || 'Page Draft'}</h2>
        <p className="text-sm text-slate-500 max-w-md">
          This page is currently unpublished or in draft review. Only live published pages are accessible on the public customer storefront.
        </p>
        <button
          onClick={() => { setTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all"
        >
          Explore Catalog Home
        </button>
      </div>
    );
  }

  // Render Modern WordPress-Style Section Blocks
  if (activePage.sections && Array.isArray(activePage.sections)) {
    const enabledSections = activePage.sections
      .filter((s: PageSection) => s.enabled)
      .sort((a: PageSection, b: PageSection) => (a.order || 0) - (b.order || 0));

    const hasHeroAtTop = enabledSections.length > 0 && enabledSections[0].type === 'hero';

    return (
      <div className={`min-h-screen bg-slate-50/50 pb-20 ${hasHeroAtTop ? '' : 'pt-28 md:pt-32'}`}>
        {enabledSections.map((sec: PageSection) => {
          switch (sec.type) {
            case 'hero':
              return (
                <section
                  key={sec.id}
                  className="relative bg-emerald-950 text-white overflow-hidden pt-28 pb-16 md:pt-36 md:pb-20 px-6 md:px-16"
                  style={{
                    backgroundImage: sec.data.imageUrl ? `linear-gradient(rgba(6, 44, 32, 0.85), rgba(6, 44, 32, 0.95)), url(${sec.data.imageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="max-w-5xl mx-auto text-center space-y-6">
                    {sec.data.badgeText && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        {sec.data.badgeText}
                      </span>
                    )}
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                      {sec.data.titleLine1 || sec.title || activePage.title}
                    </h1>
                    {sec.data.subtitle && (
                      <p className="text-base md:text-lg text-emerald-100/90 max-w-2xl mx-auto font-light">
                        {sec.data.subtitle}
                      </p>
                    )}
                    {sec.data.primaryButtonText && (
                      <div className="pt-4">
                        <button
                          onClick={() => { setTab('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
                        >
                          {sec.data.primaryButtonText}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              );

            case 'promotional_ribbon':
              return (
                <div key={sec.id} className="bg-emerald-600 text-white py-3 px-6 text-center text-xs md:text-sm font-medium shadow-sm">
                  <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 flex-wrap">
                    {sec.data.campaignLabel && (
                      <span className="font-bold uppercase tracking-wider text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded">
                        {sec.data.campaignLabel}
                      </span>
                    )}
                    <span>{sec.data.text}</span>
                    {sec.data.ctaText && (
                      <a
                        href={sec.data.ctaLink || '#shop'}
                        className="underline font-bold hover:text-emerald-100 transition-colors inline-flex items-center gap-1"
                      >
                        {sec.data.ctaText}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );

            case 'stats':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-12">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {(sec.data.stats || []).map((st: any, i: number) => (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <div className="text-2xl md:text-3xl font-extrabold text-emerald-700">{st.value || st.number}</div>
                        <div className="text-xs font-semibold text-slate-800 mt-1">{st.label}</div>
                        {st.subtext && <div className="text-[11px] text-slate-400 mt-0.5">{st.subtext}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              );

            case 'faq':
              return (
                <section key={sec.id} className="max-w-4xl mx-auto px-6 py-12 space-y-6">
                  {sec.title && <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">{sec.title}</h2>}
                  <div className="space-y-3">
                    {(sec.data.items || []).map((faq: any, i: number) => {
                      const isOpen = openFaqIndex === i;
                      return (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <button
                            onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                            className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-slate-800 hover:text-emerald-700 transition-colors"
                          >
                            <span>{faq.q || faq.question}</span>
                            {isOpen ? <ChevronUp className="w-5 h-5 text-emerald-600 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5 text-xs md:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                              {faq.a || faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );

            case 'rich_text':
              return (
                <section key={sec.id} className="max-w-4xl mx-auto px-6 py-12">
                  <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    {sec.data.heading && (
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                        {sec.data.heading}
                      </h2>
                    )}
                    <div 
                      className="prose prose-emerald max-w-none text-slate-600 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sec.data.body || sec.data.content || '' }}
                    />
                  </div>
                </section>
              );

            case 'brand_philosophy':
              return (
                <section key={sec.id} className="max-w-5xl mx-auto px-6 py-12">
                  <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-8 md:p-12 shadow-md space-y-6">
                    <span className="text-xs uppercase tracking-widest text-emerald-300 font-bold">
                      {sec.data.eyebrow || 'Regenerative Agriculture Standard'}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">{sec.data.heading || sec.title}</h2>
                    <p className="text-sm md:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
                      {sec.data.paragraph1 || sec.data.description || sec.data.paragraph2}
                    </p>
                  </div>
                </section>
              );

            case 'contact_form':
              return (
                <section key={sec.id} className="px-6">
                  <ContactFormBlock sectionData={sec.data} />
                </section>
              );

            case 'team_members':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-16">
                  {sec.title && (
                    <div className="text-center mb-12">
                      <h2 className="text-3xl font-bold text-slate-900">{sec.title}</h2>
                      {sec.data.subtitle && <p className="text-sm text-slate-500 mt-2">{sec.data.subtitle}</p>}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(sec.data.members || []).map((mem: any, mIdx: number) => (
                      <div key={mIdx} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 text-center space-y-4">
                        {mem.imageUrl && (
                          <img src={mem.imageUrl} alt={mem.name} className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-emerald-50" />
                        )}
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">{mem.name}</h4>
                          <p className="text-xs font-semibold text-emerald-700">{mem.role || mem.title}</p>
                          {mem.company && <p className="text-[11px] text-slate-400 mt-0.5">{mem.company}</p>}
                        </div>
                        {mem.bio && <p className="text-xs text-slate-600 leading-relaxed text-left">{mem.bio}</p>}
                        {mem.quote && (
                          <blockquote className="text-[11px] italic text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100/60">
                            "{mem.quote}"
                          </blockquote>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );

            case 'timeline_milestones':
              return (
                <section key={sec.id} className="max-w-4xl mx-auto px-6 py-16">
                  {sec.title && <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">{sec.title}</h2>}
                  <div className="relative pl-8 border-l-2 border-emerald-500 space-y-10">
                    {(sec.data.milestones || []).map((m: any, mIdx: number) => (
                      <div key={mIdx} className="relative group">
                        <span className="absolute -left-[41px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-emerald-600" />
                        <span className="inline-block text-xs font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          {m.year}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">{m.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{m.desc || m.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );

            case 'partner_inquiry':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-16">
                  <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white rounded-3xl p-8 md:p-14 shadow-xl">
                    <div className="max-w-3xl space-y-6">
                      <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                        {sec.data.eyebrow || 'Enterprise & Institutional Partnerships'}
                      </span>
                      <h2 className="text-3xl md:text-4xl font-bold leading-tight text-white">
                        {sec.data.heading || sec.title || 'Partner with BioCart India'}
                      </h2>
                      <p className="text-sm md:text-base text-emerald-100/90 leading-relaxed font-light">
                        {sec.data.description || 'We collaborate with state agricultural universities, organic grower clusters, CSR foundations, and nursery distributor chains across India.'}
                      </p>
                      {sec.data.pillars && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                          {sec.data.pillars.map((pil: any, pIdx: number) => (
                            <div key={pIdx} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                              <h5 className="font-bold text-xs text-emerald-300">{pil.title}</h5>
                              <p className="text-[11px] text-white/90 mt-1 leading-relaxed">{pil.desc}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pt-6 flex flex-wrap gap-4">
                        <button
                          onClick={() => { setTab('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
                        >
                          {sec.data.ctaText || 'Submit Partnership Proposal'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              );

            case 'features_list':
              return (
                <section key={sec.id} className="max-w-6xl mx-auto px-6 py-16">
                  {sec.title && <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">{sec.title}</h2>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {(sec.data.features || []).map((feat: any, fIdx: number) => (
                      <div key={fIdx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-base text-slate-900">{feat.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{feat.desc || feat.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );

            case 'cta_banner':
              return (
                <section key={sec.id} className="max-w-5xl mx-auto px-6 py-12">
                  <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-3xl p-8 md:p-12 text-white text-center space-y-4 shadow-lg">
                    <h3 className="text-2xl md:text-3xl font-bold text-white">{sec.data.title || sec.title}</h3>
                    {sec.data.subtitle && <p className="text-sm text-emerald-100 max-w-xl mx-auto">{sec.data.subtitle}</p>}
                    {sec.data.buttonText && (
                      <div className="pt-4">
                        <button
                          onClick={() => {
                            const dest = sec.data.buttonUrl || '#shop';
                            if (dest.startsWith('#')) {
                              setTab(dest.replace('#', ''));
                            } else {
                              window.location.href = dest;
                            }
                          }}
                          className="px-6 py-3 bg-white text-emerald-950 font-extrabold text-xs rounded-xl shadow transition-all hover:bg-emerald-50 cursor-pointer"
                        >
                          {sec.data.buttonText}
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              );

            case 'order_tracking':
              return (
                <section key={sec.id} className="px-6">
                  <OrderTrackerBlock sectionData={sec.data} />
                </section>
              );

            case 'soil_consultation':
              return (
                <section key={sec.id} className="px-6">
                  <SoilConsultationBlock sectionData={sec.data} />
                </section>
              );

            case 'dealer_locator':
              return (
                <section key={sec.id} className="px-6">
                  <DealerLocatorBlock sectionData={sec.data} />
                </section>
              );

            default:
              // Fallback block renderer
              return (
                <section key={sec.id} className="max-w-4xl mx-auto px-6 py-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    {sec.title && <h3 className="text-lg font-bold text-slate-900 mb-2">{sec.title}</h3>}
                    {sec.data.content && (
                      <div 
                        className="text-sm text-slate-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sec.data.content }}
                      />
                    )}
                  </div>
                </section>
              );
          }
        })}
      </div>
    );
  }

  // Fallback for standard or category legacy format
  return (
    <div className="max-w-4xl mx-auto px-6 pt-28 pb-16 sm:pt-32 space-y-8">
      {activePage.image && (
        <img src={activePage.image} alt={activePage.title} className="w-full h-80 object-cover rounded-2xl shadow-md" />
      )}
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{activePage.title || activePage.heroTitle}</h1>
      <div 
        className="prose max-w-none text-slate-600 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: activePage.content || activePage.description || '' }}
      />
    </div>
  );
};

export default GenericCMSPage;
