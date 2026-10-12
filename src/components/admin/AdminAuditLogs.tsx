import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsub = AdminService.subscribeToAuditLogs ? AdminService.subscribeToAuditLogs(setLogs) : () => {};
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Audit Logs</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-700">Timestamp</th>
              <th className="p-4 font-semibold text-slate-700">Action</th>
              <th className="p-4 font-semibold text-slate-700">Entity</th>
              <th className="p-4 font-semibold text-slate-700">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-slate-100">
                <td className="p-4 text-slate-600">{new Date(log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleString()}</td>
                <td className="p-4 font-medium text-slate-900">{log.action}</td>
                <td className="p-4 text-slate-600">{log.entityType} ({log.entityId})</td>
                <td className="p-4 text-slate-500 text-xs font-mono">{JSON.stringify(log.details)}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">No logs found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
