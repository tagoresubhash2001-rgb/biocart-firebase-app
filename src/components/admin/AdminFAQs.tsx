import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';
import { AdminService } from '../../services/AdminService';

export const AdminFAQs: React.FC = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ question: '', answer: '', active: true, order: 0 });

  useEffect(() => {
    const unsub = AdminService.subscribeToFAQs ? AdminService.subscribeToFAQs(setFaqs) : () => {};
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (isEditing === 'new') {
      await AdminService.addFAQ?.(formData);
    } else if (isEditing) {
      await AdminService.updateFAQ?.(isEditing, formData);
    }
    setIsEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">FAQ Management</h2>
        <button onClick={() => { setIsEditing('new'); setFormData({ question: '', answer: '', active: true, order: faqs.length }); }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Add FAQ
        </button>
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <input type="text" placeholder="Question" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full p-3 border rounded-xl" />
          <textarea placeholder="Answer" value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} className="w-full p-3 border rounded-xl h-24" />
          <div className="flex gap-4">
            <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl"><Save className="w-4 h-4" /> Save</button>
            <button onClick={() => setIsEditing(null)} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl"><X className="w-4 h-4" /> Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {faqs.map(faq => (
          <div key={faq.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900">{faq.question}</h3>
              <p className="text-sm text-slate-600 line-clamp-1">{faq.answer}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => AdminService.updateFAQ?.(faq.id, { active: !faq.active })} className="p-2 text-slate-400 hover:text-emerald-600">
                {faq.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => { setIsEditing(faq.id); setFormData(faq); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => AdminService.deleteFAQ?.(faq.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
