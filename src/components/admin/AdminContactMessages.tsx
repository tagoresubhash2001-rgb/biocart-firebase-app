import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Mail, CheckCircle2, Circle, Trash2, Calendar, User, Phone, MapPin } from 'lucide-react';
// removed date-fns import

export const AdminContactMessages: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date()
      }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'unread' ? 'read' : 'unread';
    await updateDoc(doc(db, 'contact_messages', id), {
      status: newStatus
    });
  };

  const deleteMessage = async (id: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      await deleteDoc(doc(db, 'contact_messages', id));
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center">Loading messages...</div>;
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 md:p-8 bg-slate-50 ">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 ">Contact Messages</h1>
          <p className="text-sm text-slate-600  mt-1">Manage inquiries, dealer registrations, and distributor requests.</p>
        </div>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No messages found.</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`bg-white  rounded-2xl p-6 border ${msg.status === 'unread' ? 'border-nature-500  shadow-md' : 'border-slate-200  shadow-sm'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      msg.formType === 'dealer' ? 'bg-amber-100 text-amber-700' :
                      msg.formType === 'distributor' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {msg.formType === 'general' ? 'General' : msg.formType === 'dealer' ? 'Dealer' : 'Distributor'}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {msg.createdAt.toLocaleDateString()} {msg.createdAt.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-900  font-medium">
                      <User className="w-4 h-4 text-slate-400" />
                      {msg.name}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 ">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${msg.email}`} className="hover:text-nature-600 transition-colors">{msg.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 ">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {msg.phone}
                    </div>
                    {msg.city && (
                      <div className="flex items-center gap-2 text-slate-600 ">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {msg.city}
                      </div>
                    )}
                    {msg.companyName && (
                      <div className="flex items-center gap-2 text-slate-600  md:col-span-2">
                        <span className="font-semibold">Company:</span> {msg.companyName}
                      </div>
                    )}
                    {msg.volumeEstimate && (
                      <div className="flex items-center gap-2 text-slate-600  md:col-span-2">
                        <span className="font-semibold">Volume:</span> {msg.volumeEstimate}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50  p-4 rounded-xl text-sm text-slate-700  border border-slate-100  whitespace-pre-wrap">
                    {msg.message}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => toggleStatus(msg.id, msg.status)}
                    className="p-2 bg-slate-100 hover:bg-slate-200  :bg-charcoal-700 text-slate-600  rounded-lg transition-colors"
                    title={msg.status === 'unread' ? 'Mark as Read' : 'Mark as Unread'}
                  >
                    {msg.status === 'unread' ? <Circle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  </button>
                  <button 
                    onClick={() => deleteMessage(msg.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100  :bg-rose-900/50 text-rose-500 rounded-lg transition-colors"
                    title="Delete Message"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
