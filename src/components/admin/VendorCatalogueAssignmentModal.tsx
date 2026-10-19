import React, { useState, useEffect } from 'react';
import { VendorItem, Product, VendorProductAssignment } from '../../types';
import { AdminService } from '../../services/AdminService';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  PackagePlus,
  Search,
  CheckCircle2,
  Trash2,
  X,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { BioCartLoading } from '../ui/BioCartLoading';

interface VendorCatalogueAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorItem;
}

export const VendorCatalogueAssignmentModal: React.FC<VendorCatalogueAssignmentModalProps> = ({
  isOpen,
  onClose,
  vendor
}) => {
  const { userProfile, firebaseUser } = useAuth();
  const { addToast } = useApp();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<VendorProductAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubProducts = AdminService.subscribeToProducts((prods) => {
      setAllProducts(prods);
      setLoading(false);
    });

    const unsubAssignments = AdminService.subscribeToVendorAssignments(vendor.id, (list) => {
      setAssignments(list);
    });

    return () => {
      unsubProducts();
      unsubAssignments();
    };
  }, [isOpen, vendor.id]);

  if (!isOpen) return null;

  const actor = {
    id: userProfile?.uid || firebaseUser?.uid || 'admin',
    email: userProfile?.email || firebaseUser?.email || 'admin@biocart.in'
  };

  const assignedProductIds = new Set(assignments.map((a) => a.productId));

  const filteredProducts = allProducts.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleAssign = async (product: Product) => {
    setAssigningId(product.id);
    try {
      await AdminService.assignProductToVendor(vendor, product, actor);
      addToast(`Assigned "${product.name}" to ${vendor.storeName}`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to assign product', 'warning');
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemove = async (productId: string, productName: string) => {
    try {
      await AdminService.removeProductFromVendor(vendor.id, productId, actor);
      addToast(`Removed assignment for "${productName}"`, 'info');
    } catch (err: any) {
      addToast(err?.message || 'Failed to remove assignment', 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Catalogue Products Assignment</h2>
              <p className="text-xs text-slate-500">
                Assign official BioCart master products to <span className="font-semibold text-emerald-800">{vendor.storeName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Assigned Products Counter Banner */}
        <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Currently Assigned: {assignments.length} Catalogue Products</span>
          </div>
          <span className="text-[11px] text-emerald-700">Vendor ID: {vendor.id}</span>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-grow overflow-y-auto space-y-4 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search catalogue products by name, SKU, or category..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {loading ? (
            <BioCartLoading message="Loading catalogue products..." subMessage="Fetching from master catalog" />
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {filteredProducts.map((prod) => {
                const isAssigned = assignedProductIds.has(prod.id);
                const isBusy = assigningId === prod.id;

                return (
                  <div
                    key={prod.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{prod.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>SKU: {prod.sku}</span>
                          <span>•</span>
                          <span className="capitalize">{prod.category}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">₹{prod.price}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isAssigned ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Assigned
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(prod.id, prod.name)}
                            title="Remove catalogue assignment"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAssign(prod)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          {isBusy ? 'Assigning...' : 'Assign Product'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-xs">No matching products found in catalogue</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
