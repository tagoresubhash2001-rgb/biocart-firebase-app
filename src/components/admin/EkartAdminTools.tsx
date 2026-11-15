import React, { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { RefreshCw, Webhook, ScrollText } from 'lucide-react';
import { db } from '../../config/firebase';
import { ShippingService } from '../../services/ShippingService';
import { useApp } from '../../context/AppContext';

interface EkartApiLog {
  id: string;
  at?: string;
  function?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  orderNumber?: string;
  vendorId?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  result?: string;
  [key: string]: unknown;
}

const pretty = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string') {
    try { return JSON.stringify(JSON.parse(v), null, 2); } catch { return v; }
  }
  return JSON.stringify(v, null, 2);
};

/** Admin-only: register the EKART webhook and inspect the last 50 EKART API calls. */
export const EkartAdminTools: React.FC = () => {
  const { addToast } = useApp();
  const [logs, setLogs] = useState<EkartApiLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [webhookResult, setWebhookResult] = useState('');

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogsError('');
    try {
      const snap = await getDocs(query(collection(db, 'ekart_api_logs'), orderBy('at', 'desc'), limit(50)));
      setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })));
    } catch (err: any) {
      setLogsError(err?.message || 'Could not load EKART API logs.');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleRegisterWebhook = async () => {
    setRegistering(true);
    setWebhookResult('');
    try {
      const res = await ShippingService.registerWebhook();
      setWebhookResult(`${res.message} (${res.url})`);
      addToast(res.message || 'EKART webhook registered.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'EKART did not accept the webhook registration.';
      setWebhookResult(msg);
      addToast(msg, 'error');
    } finally {
      setRegistering(false);
      loadLogs();
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">EKART tracking webhook</h2>
            <p className="text-xs text-slate-500">
              Tells EKART to send tracking updates to BioCart, so orders move to shipped and delivered automatically.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRegisterWebhook}
          disabled={registering}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {registering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Webhook className="w-3.5 h-3.5" />}
          Register EKART webhook
        </button>
        {webhookResult && <p className="text-xs text-slate-700 break-words">{webhookResult}</p>}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">EKART API log (last 50 calls)</h2>
              <p className="text-xs text-slate-500">Every request BioCart sends to EKART and EKART's real reply. Click a row for details.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadLogs}
            disabled={loadingLogs}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {logsError && <p className="text-xs text-red-600">{logsError}</p>}
        {!logsError && !loadingLogs && logs.length === 0 && (
          <p className="text-xs text-slate-400 py-4 text-center">No EKART API calls have been logged yet.</p>
        )}

        {logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Function</th>
                  <th className="py-2 pr-3">Request</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2">ms</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const ok = typeof l.status === 'number' && l.status >= 200 && l.status < 300;
                  const open = openLogId === l.id;
                  return (
                    <React.Fragment key={l.id}>
                      <tr
                        onClick={() => setOpenLogId(open ? null : l.id)}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer align-top"
                      >
                        <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{l.at ? new Date(l.at).toLocaleString('en-IN') : '—'}</td>
                        <td className="py-2 pr-3 font-semibold text-slate-800">{l.function || '—'}</td>
                        <td className="py-2 pr-3 font-mono text-slate-700 break-all">{l.method} {l.path}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {l.status === 0 ? 'no reply' : l.status ?? '—'}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-600">{l.orderNumber || '—'}</td>
                        <td className="py-2 text-slate-500">{l.durationMs ?? '—'}</td>
                      </tr>
                      {open && (
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <td colSpan={6} className="p-3 space-y-2">
                            {l.result && <p className="text-slate-700"><span className="font-semibold">Result:</span> {String(l.result)}</p>}
                            <div>
                              <p className="font-semibold text-slate-700 mb-1">Sent to EKART</p>
                              <pre className="bg-white border border-slate-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px]">{pretty(l.requestBody)}</pre>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-700 mb-1">EKART replied</p>
                              <pre className="bg-white border border-slate-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px]">{pretty(l.responseBody)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
