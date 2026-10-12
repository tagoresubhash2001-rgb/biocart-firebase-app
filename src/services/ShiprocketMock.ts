export const ShiprocketMock = {
  createShipment: async (vendorOrderId: string, vendorId: string, items: any[]) => {
    console.log(`[MOCK] Creating Shiprocket Shipment for VendorOrder ${vendorOrderId} Vendor: ${vendorId}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          shipmentId: `ship_${Math.random().toString(36).substring(2, 10)}`,
          trackingNumber: `AWB${Math.floor(Math.random() * 100000000)}`,
          status: 'manifested'
        });
      }, 1000);
    });
  },
  trackShipment: async (trackingNumber: string) => {
    return {
      trackingNumber,
      status: 'in_transit',
      location: 'Hub - Mumbai'
    };
  }
};
