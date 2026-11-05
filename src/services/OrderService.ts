import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  writeBatch,
  getDocs,
  query,
  where,
  getDoc,
  increment
} from 'firebase/firestore';
import { 
  OrderEntity, 
  VendorOrderEntity, 
  OrderItemEntity,
  EntityFactory
} from '../types/backend';
import { normalizeError } from '../utils/errors';

export class OrderService {
  static async createOrder(
    userId: string, 
    items: { productId: string; quantity: number }[],
    shippingAddress: any,
    paymentMethod: 'cod' | 'cashfree' | 'stripe' | 'card'
  ): Promise<{ orderId: string }> {
    try {
      const batch = writeBatch(db);
      
      // 1. Fetch products to get vendor mapping and prices
      const productIds = items.map(i => i.productId);
      const productsRef = collection(db, 'products');
      // For a real app, you'd chunk this if > 10 items
      const productsQuery = query(productsRef, where('id', 'in', productIds));
      const productsSnapshot = await getDocs(productsQuery);
      
      const products = productsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {} as Record<string, any>);

      // 2. Group items by Vendor
      const vendorGroups: Record<string, any[]> = {};
      
      for (const item of items) {
        const product = products[item.productId];
        if (!product) throw new Error(`Product ${item.productId} not found`);
        
        const vendorId = product.vendorId || 'default_vendor';
        if (!vendorGroups[vendorId]) vendorGroups[vendorId] = [];
        
        vendorGroups[vendorId].push({
          ...item,
          product
        });
      }

      // 3. Create Parent Order
      const parentOrderRef = doc(collection(db, 'orders'));
      const parentOrderId = parentOrderRef.id;
      
      let totalAmountPaise = 0;
      let totalTaxAmountPaise = 0;
      let totalShippingCostPaise = 0;
      let totalSubtotalPaise = 0;
      
      const vendorOrders = [];
      const orderItems = [];

      // 4. Create Vendor Orders & Order Items
      for (const [vendorId, groupItems] of Object.entries(vendorGroups)) {
        const vendorOrderRef = doc(collection(db, 'vendor_orders'));
        const vendorOrderId = vendorOrderRef.id;
        
        let vSubtotal = 0;
        let vTax = 0;
        let vShipping = 0; // Simplified
        let vTotal = 0;
        
        for (const item of groupItems) {
          const itemPricePaise = item.product.price * 100; // Assuming product.price is in Rs
          const itemTotal = itemPricePaise * item.quantity;
          
          vSubtotal += itemTotal;
          // Simple 18% tax assumption for now if needed, or based on product
          vTax += Math.round(itemTotal * 0.18);
          
          const orderItemRef = doc(collection(db, 'order_items'));
          const orderItem = {
            ...EntityFactory.createBase(userId),
            id: orderItemRef.id,
            orderId: parentOrderId,
            vendorOrderId: vendorOrderId,
            productId: item.productId,
            sku: item.product.sku || '',
            name: item.product.name,
            pricePaise: itemPricePaise,
            quantity: item.quantity,
            totalPaise: itemTotal
          };
          
          batch.set(orderItemRef, orderItem);
          orderItems.push(orderItem);
        }
        
        vTotal = vSubtotal + vTax + vShipping;
        
        // Commission logic (e.g., 10%)
        const commissionAmountPaise = Math.round(vSubtotal * 0.10);
        const vendorSettlementAmountPaise = vTotal - commissionAmountPaise;
        
        const vendorOrder: VendorOrderEntity = {
          ...EntityFactory.createBase(userId),
          id: vendorOrderId,
          orderId: parentOrderId,
          vendorId: vendorId,
          vendorOrderNumber: `VO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          subtotalPaise: vSubtotal,
          discountAmountPaise: 0,
          taxAmountPaise: vTax,
          shippingCostPaise: vShipping,
          totalAmountPaise: vTotal,
          commissionAmountPaise: commissionAmountPaise,
          vendorSettlementAmountPaise: vendorSettlementAmountPaise,
          status: 'placed'
        };
        
        batch.set(vendorOrderRef, vendorOrder);
        vendorOrders.push(vendorOrder);
        
        // Add to parent order totals
        totalSubtotalPaise += vSubtotal;
        totalTaxAmountPaise += vTax;
        totalShippingCostPaise += vShipping;
        totalAmountPaise += vTotal;

        // Wallet Ledger Logic for Vendor
        const vendorWalletLedgerRef = doc(collection(db, `vendors/${vendorId}/wallet_ledger`));
        batch.set(vendorWalletLedgerRef, {
          id: vendorWalletLedgerRef.id,
          vendorId: vendorId,
          orderId: parentOrderId,
          vendorOrderId: vendorOrderId,
          type: 'credit',
          bucket: 'pending', // Added to pending bucket
          amountPaise: vendorSettlementAmountPaise,
          description: `Sale from Order ${parentOrderId}`,
          createdAt: new Date().toISOString()
        });

        // Update vendor wallet pending bucket
        const vendorRef = doc(db, 'vendors', vendorId);
        batch.update(vendorRef, {
          'wallets.pending': increment(vendorSettlementAmountPaise)
        });
      }

      // 5. Finalize Parent Order
      const parentOrder: any = {
        ...EntityFactory.createBase(userId),
        id: parentOrderId,
        userId,
        orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status: 'placed',
        orderStatus: 'placed',
        statusHistory: [
          {
            status: 'placed',
            at: new Date().toISOString(),
            by: userId,
            role: 'customer',
            reason: 'Order placed by customer'
          }
        ],
        paymentMethod: paymentMethod,
        paymentStatus: 'pending',
        shippingAddressId: 'addr_1', // Mocked or created
        billingAddressId: 'addr_1',
        subtotalPaise: totalSubtotalPaise,
        discountAmountPaise: 0,
        taxAmountPaise: totalTaxAmountPaise,
        shippingCostPaise: totalShippingCostPaise,
        totalAmountPaise: totalAmountPaise,
      };
      
      batch.set(parentOrderRef, parentOrder);
      
      // Commit all
      await batch.commit();
      
      return { orderId: parentOrderId };
    } catch (err) {
      throw normalizeError(err);
    }
  }
}
