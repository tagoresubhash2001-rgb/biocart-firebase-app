import React, { useState, useEffect, useMemo } from 'react';
import { AdminService } from '../../services/AdminService';
import { AuditLog } from '../../types';
import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { BioCartLoading } from '../ui/BioCartLoading';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 15;

  useEffect(() => {
    const unsub = AdminService.subscribeToAuditLogs((data) => {
      setLogs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.actorEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entityId || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEntity =
        selectedEntity === 'all' || (log.entityType || '').toLowerCase() === selectedEntity.toLowerCase();

      return matchesSearch && matchesEntity;
    });
  }, [logs, searchTerm, selectedEntity]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const entityTypes = ['all', 'product', 'category', 'vendor', 'settings', 'page', 'banner', 'user', 'coupon'];

  if (loading) {
    return <BioCartLoading message="Loading System Audit Logs..." subMessage="Fetching secure activity records from Firestore" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            System Audit Logs & Security Activity
          </h1>
          <p className="text-xs text-slate-500">
            Immutable trace of administrative mutations, catalogue syncs, vendor onboarding & security events.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200">
          <Activity className="w-3.5 h-3.5" />
          <span>{filteredLogs.length} Events Recorded</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search action, actor email, or entity ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500 flex-shrink-0">Entity:</span>
          {entityTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSelectedEntity(type);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors flex-shrink-0 cursor-pointer ${
                selectedEntity === type
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor Identity</th>
                <th className="p-3.5">Action & Event</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedLogs.map((log) => {
                const dateStr = log.timestamp
                  ? new Date((log.timestamp as any)?.toDate ? (log.timestamp as any).toDate() : log.timestamp).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })
                  : '—';

                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[180px]">{log.actorEmail || 'System'}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900">
                      {log.action}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {log.entityType}
                      </span>
                      {log.entityId && (
                        <span className="ml-1.5 font-mono text-[10px] text-slate-500">#{log.entityId}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No matching audit logs found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or entity filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              Page {currentPage} of {totalPages} ({filteredLogs.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Audit Event Metadata</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Action:</span>
                <span className="font-bold text-slate-900">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Actor UID:</span>
                <span className="font-mono text-slate-700">{selectedLog.actorId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Actor Email:</span>
                <span className="font-mono text-emerald-700 font-semibold">{selectedLog.actorEmail}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Target Entity:</span>
                <span className="font-semibold text-slate-800">{selectedLog.entityType} ({selectedLog.entityId})</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Payload Diff & Changes:</p>
              <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-800 overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
