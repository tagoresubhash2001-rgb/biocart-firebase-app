import { useEffect, useRef, useState } from 'react';
import { collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Live "new order" alerts for a seller while the Vendor Console is open:
 * - count of paid orders waiting to be accepted (status "new")
 * - a chime + browser notification + blinking tab title when a new paid order arrives
 */
export function useNewOrderAlerts(vendorId: string | null | undefined) {
  const [newCount, setNewCount] = useState(0);
  const [latest, setLatest] = useState<{ id: string; label: string } | null>(null);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    seen.current = null;
    const q = query(collectionGroup(db, 'vendor_orders'), where('vendorId', '==', vendorId));
    const unsub = onSnapshot(q, (snap) => {
      const waiting = snap.docs.filter((d) => d.data().status === 'new');
      setNewCount(waiting.length);
      const ids = waiting.map((d) => d.ref.parent.parent?.id || d.id);
      if (seen.current === null) { seen.current = new Set(ids); return; } // first load: no alert
      const fresh = waiting.filter((d) => !seen.current!.has(d.ref.parent.parent?.id || d.id));
      ids.forEach((id) => seen.current!.add(id));
      if (fresh.length) {
        const d: any = fresh[0].data();
        const id = fresh[0].ref.parent.parent?.id || fresh[0].id;
        const label = `${d.orderNumber || id} · ${(d.items || []).map((i: any) => `${i.name} ×${i.quantity}`).join(', ')}`.slice(0, 120);
        setLatest({ id, label });
        ring();
        notify(fresh.length > 1 ? `${fresh.length} new BioCart orders` : 'New BioCart order', label);
      }
    }, () => undefined);
    return () => unsub();
  }, [vendorId]);

  // Blink the tab title while orders are waiting.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) New order[s]? · /, '');
    if (!newCount) { document.title = base; return; }
    let on = true;
    const t = setInterval(() => { document.title = on ? `(${newCount}) New order${newCount > 1 ? 's' : ''} · ${base}` : base; on = !on; }, 1500);
    return () => { clearInterval(t); document.title = base; };
  }, [newCount]);

  return { newCount, latest, dismiss: () => setLatest(null) };
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function enableOrderNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') { ring(); return true; }
  const p = await Notification.requestPermission();
  if (p === 'granted') ring();
  return p === 'granted';
}

function notify(title: string, body: string) {
  try {
    if (notificationsSupported() && Notification.permission === 'granted') {
      const n = new Notification(title, { body, icon: '/assets/biocart_logo_official.png', tag: 'biocart-new-order' });
      n.onclick = () => { window.focus(); window.location.hash = 'vendor/orders'; n.close(); };
    }
  } catch { /* some mobile browsers only allow notifications from a service worker */ }
  try { navigator.vibrate?.([300, 120, 300]); } catch { /* ignore */ }
}

/** Short two-tone chime (no audio file needed). */
function ring() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1320, 880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      const t = ctx.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.21);
    });
    setTimeout(() => ctx.close?.(), 1500);
  } catch { /* ignore */ }
}
