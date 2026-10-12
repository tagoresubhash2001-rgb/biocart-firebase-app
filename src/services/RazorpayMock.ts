export const RazorpayMock = {
  initializePayment: async (orderId: string, amount: number, user: any) => {
    console.log(`[MOCK] Initializing Razorpay for Order ${orderId} Amount: ${amount}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: `pay_${Math.random().toString(36).substring(2, 10)}`,
          orderId,
          amount
        });
      }, 1500);
    });
  }
};
