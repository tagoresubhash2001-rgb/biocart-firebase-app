import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { Review } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  Star, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  EyeOff, 
  Filter, 
  Sparkles
} from 'lucide-react';

export const AdminReviews: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    return AdminService.subscribeToReviews((list) => setReviews(list));
  }, []);

  const actor = {
    id: userProfile?.uid || 'admin',
    email: userProfile?.email || 'admin@biocart.com'
  };

  const handleUpdateStatus = async (id: string, status: Review['status']) => {
    try {
      await AdminService.updateReviewStatus(id, status, actor);
      addToast(`Review status updated to ${status}`, 'success');
    } catch (err) {
      addToast('Failed to update review status', 'warning');
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await AdminService.deleteReview(id, actor);
      addToast('Review deleted permanently', 'info');
    } catch (err) {
      addToast('Failed to delete review', 'warning');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filterStatus === 'all') return true;
    return (r.status || 'approved') === filterStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            Reviews & Testimonials Moderation
          </h1>
          <p className="text-xs text-[#777777]">Only approved reviews will display on customer product pages and testimonials.</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#777777]" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">All Reviews ({reviews.length})</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Moderation</option>
            <option value="rejected">Rejected</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((rev) => (
            <div key={rev.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {rev.avatar ? (
                    <img src={rev.avatar} alt={rev.user} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-950 text-emerald-400 font-bold flex items-center justify-center text-xs">
                      {rev.user.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">{rev.user}</h3>
                    <p className="text-[11px] text-[#777777]">{rev.productName ? `For: ${rev.productName}` : 'General BioCart Review'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400' : 'text-slate-700'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#777777] font-mono">{rev.date}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 italic">
                "{rev.comment}"
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  rev.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  rev.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {rev.status || 'approved'}
                </span>

                <div className="flex items-center gap-2">
                  {rev.status !== 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus(rev.id, 'approved')}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {rev.status !== 'rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(rev.id, 'rejected')}
                      className="px-3 py-1 bg-amber-900/60 text-amber-300 hover:bg-amber-800 rounded-lg text-xs flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteReview(rev.id)}
                    className="p-1.5 text-[#777777] hover:text-rose-400 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-[#777777] text-xs bg-white/60 rounded-2xl border border-slate-200">
            No reviews match the selected filter status.
          </div>
        )}
      </div>
    </div>
  );
};
