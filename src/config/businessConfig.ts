/**
 * BioCart Centralized Business & Enterprise Configuration
 * Source of Truth: Verified Udyam Registration Certificate & Official Contact Record
 */

export interface BusinessConfig {
  legalEnterpriseName: string;
  brandName: string;
  constitution: 'Proprietorship' | 'Partnership' | 'Private Limited' | 'LLP';
  udyamRegistrationNumber: string;
  enterpriseClassification: 'Micro' | 'Small' | 'Medium';
  majorActivity: string;
  registrationDate: string; // DD-MM-YYYY
  officialAddress: {
    city: string;
    state: string;
    pincode: string;
    country: string;
    fullAddress: string;
  };
  fulfillmentAddress: {
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
  };
  contact: {
    supportPhone: string;
    supportPhoneDisplay: string;
    supportEmail: string;
    foundersEmail: string;
    whatsappNumber: string;
    whatsappUrl: string;
    instagramUrl: string;
    businessHours: string;
  };
  gstRegistered: boolean;
  gstNote: string;
}

export const BUSINESS_CONFIG: BusinessConfig = {
  legalEnterpriseName: 'SINDULIS INNOVATIVE SOLUTIONS',
  brandName: 'BioCart',
  constitution: 'Proprietorship',
  udyamRegistrationNumber: 'UDYAM-AP-23-0104910',
  enterpriseClassification: 'Micro',
  majorActivity: 'Services',
  registrationDate: '04-11-2026',
  officialAddress: {
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    pincode: '517507',
    country: 'India',
    fullAddress: 'Tirupati, Andhra Pradesh – 517507, India'
  },
  fulfillmentAddress: {
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    pincode: '517507',
    fullAddress: 'Fulfillment & Logistics Facility, Tirupati, Andhra Pradesh – 517507, India'
  },
  contact: {
    supportPhone: '+91949080479',
    supportPhoneDisplay: '+91 949080479',
    supportEmail: 'biocart.2025@gmail.com',
    foundersEmail: 'biocart.2025@gmail.com',
    whatsappNumber: '91949080479',
    whatsappUrl: 'https://wa.me/91949080479',
    instagramUrl: 'https://www.instagram.com/bio_cart/?hl=en',
    businessHours: 'Mon–Sat: 9:00 AM – 6:00 PM IST'
  },
  gstRegistered: false,
  gstNote: 'Micro enterprise operating within statutory turnover limits under GST Act, 2017'
};
