# Patch: src/components/vendor/VendorProducts.tsx

This file currently has ZERO vendor isolation — it shows/edits every vendor's products and lets a vendor assign any product to any vendor via a dropdown. Apply these 4 changes exactly (everything else in the file — image upload, layout, search/filter UI — stays as-is).

## 1. Add imports for a filtered, direct Firestore query

**FIND** (near the top, with the other imports):
```tsx
import { AdminService } from '../../services/AdminService';
import { StorageService } from '../../services/StorageService';
import { Product, CategoryItem, VendorItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
```

**REPLACE WITH:**
```tsx
import { AdminService } from '../../services/AdminService';
import { StorageService } from '../../services/StorageService';
import { Product, CategoryItem, VendorItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
```

## 2. Filter the products subscription to only this vendor's own products

**FIND** the effect that loads products/categories/vendors (it currently calls `AdminService.subscribeToProducts` and `AdminService.subscribeToVendors` with NO filter — every vendor sees every product):
```tsx
  useEffect(() => {
    const unsubProducts = AdminService.subscribeToProducts((list) => setProducts(list));
    const unsubCategories = AdminService.subscribeToCategories((list) => setCategories(list));
    const unsubVendors = AdminService.subscribeToVendors((list) => setVendors(list));
    return () => {
      unsubProducts();
      unsubCategories();
      unsubVendors();
    };
  }, []);
```

**REPLACE WITH:**
```tsx
  const vendorId = userProfile?.uid;

  useEffect(() => {
    // FIXED: this previously subscribed to ALL products from ALL vendors
    // with no filter, and ALL vendors — any vendor logged in could see and
    // edit every other vendor's products. Now scoped to just this vendor.
    if (!vendorId) return;
    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), where('vendorId', '==', vendorId)),
      (snap) => {
        const list: Product[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setProducts(list);
      },
      (err) => console.error('Vendor products subscription error:', err)
    );
    const unsubCategories = AdminService.subscribeToCategories((list) => setCategories(list));
    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, [vendorId]);
```

Note: `userProfile` must already be destructured from `useAuth()` above this effect (it already is, in the existing file — `const { userProfile } = useAuth();`). Also remove the now-unused `vendors` state variable and its `useState<VendorItem[]>([])` line if nothing else in the file reads it after step 3 below.

## 3. Force vendorId on new products — remove the vendor picker entirely

**FIND** (inside `handleOpenCreateModal`, the default values for a new product):
```tsx
      vendorId: vendors[0]?.id || 'vendor-biocart-official',
      vendorName: vendors[0]?.storeName || 'BioCart Direct',
```

**REPLACE WITH:**
```tsx
      vendorId: vendorId,
      vendorName: userProfile?.name || 'My Store',
```

**FIND** (the "Vendor Supplier" dropdown further down the form — a vendor should never be able to reassign a product to a different vendor):
```tsx
                <div>
                  <label className="block text-[#777777] mb-1">Vendor Supplier</label>
                  <select
                    value={editingProduct.vendorId || ''}
                    onChange={(e) => {
                      const v = vendors.find((v) => v.id === e.target.value);
                      setEditingProduct({
                        ...editingProduct,
                        vendorId: e.target.value,
                        vendorName: v?.storeName || 'BioCart Direct'
                      });
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.storeName}</option>
                    ))}
                  </select>
                </div>
```

**REPLACE WITH** (a locked, non-editable field — you cannot move a product to a different vendor from here):
```tsx
                <div>
                  <label className="block text-[#777777] mb-1">Vendor Supplier</label>
                  <input
                    type="text"
                    disabled
                    value={userProfile?.name || 'My Store'}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>
```

## 4. Force vendorId on save too (defense in depth — the Firestore rules already enforce this server-side, but belt-and-suspenders on the client avoids a confusing failed-write toast)

**FIND** (inside `handleSaveProduct`):
```tsx
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;
    try {
      await AdminService.saveProduct(editingProduct, actor);
```

**REPLACE WITH:**
```tsx
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;
    try {
      await AdminService.saveProduct({ ...editingProduct, vendorId }, actor);
```
