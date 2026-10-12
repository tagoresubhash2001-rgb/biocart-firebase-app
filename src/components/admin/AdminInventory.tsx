import React, { useEffect, useState } from 'react';
import { InventoryService } from '../../services/EnterpriseServices';
import { InventoryEntity } from '../../types/backend';
import { Search, Package, Save, X, Settings2 } from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryEntity | null>(null);
  const [newQuantity, setNewQuantity] = useState(0);
  const [newAvailable, setNewAvailable] = useState(0);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      let result = await InventoryService.getAllInventory();
      if (result.length === 0) {
        await InventoryService.initializeMissingInventory();
        result = await InventoryService.getAllInventory();
      }
      setInventory(result);
    } catch (err) {
      console.error("Failed to load inventory for admin", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetchInventory();
    return () => { isMounted = false; };
  }, []);

  const openEditModal = (item: InventoryEntity) => {
    setEditingItem(item);
    setNewQuantity(item.quantity);
    setNewAvailable(item.availableQuantity);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await InventoryService.updateInventory(editingItem.productId, newQuantity, newAvailable);
      setIsModalOpen(false);
      fetchInventory();
    } catch (err) {
      console.error("Failed to update inventory", err);
      alert("Failed to update inventory.");
    }
  };

  const filteredInventory = inventory.filter(i => 
    i.productId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 ">
      <div className="p-6 md:p-8 border-b border-slate-200  bg-white  flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 ">Inventory Management</h1>
            <p className="text-sm text-slate-600  mt-1">Track and adjust stock levels across products.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Product ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100  border border-slate-200  rounded-lg text-sm text-slate-900  focus:outline-none focus:border-nature-600 focus:ring-1 focus:ring-nature-600"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-nature-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white  rounded-2xl border border-slate-200  shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50  text-slate-600  border-b border-slate-200 ">
                  <tr>
                    <th className="px-6 py-4 font-bold">Product ID</th>
                    <th className="px-6 py-4 font-bold">Total Qty</th>
                    <th className="px-6 py-4 font-bold">Available</th>
                    <th className="px-6 py-4 font-bold">Reserved</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 ">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 :bg-white/5 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 ">
                        {item.productId}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 ">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.availableQuantity > 10 ? 'bg-emerald-100 text-emerald-700  ' :
                          item.availableQuantity > 0 ? 'bg-amber-100 text-amber-700  ' :
                          'bg-rose-100 text-rose-700  '
                        }`}>
                          {item.availableQuantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 ">
                        {item.reservedQuantity}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 :bg-blue-900/30 rounded-lg transition-colors" title="Adjust Stock">
                          <Settings2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No inventory records found matching "{searchQuery}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && editingItem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white  rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-200  flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 ">Adjust Stock</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100 :bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="inventory-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Product ID</label>
                  <input type="text" disabled value={editingItem.productId} className="w-full px-4 py-2 bg-slate-100  border border-slate-200  rounded-lg text-slate-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Total Quantity</label>
                  <input required type="number" min={0} value={newQuantity} onChange={e => setNewQuantity(parseInt(e.target.value))} className="w-full px-4 py-2 bg-slate-50  border border-slate-200  rounded-lg text-slate-900  focus:outline-none focus:border-nature-600" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Available Quantity</label>
                  <input required type="number" min={0} value={newAvailable} onChange={e => setNewAvailable(parseInt(e.target.value))} className="w-full px-4 py-2 bg-slate-50  border border-slate-200  rounded-lg text-slate-900  focus:outline-none focus:border-nature-600" />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-200  bg-slate-50  flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-slate-600  font-semibold hover:bg-slate-200 :bg-white/10 rounded-lg transition-colors">
                Cancel
              </button>
              <button form="inventory-form" type="submit" className="px-5 py-2 bg-nature-700 hover:bg-nature-800 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" /> Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
