import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { removeUndefined } from '../utils/firestore';

export const couponRepository = {
  find: async (q: any) => {
    const snap = await getDocs(collection(db, 'coupons'));
    const items: any[] = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return { items };
  },
  create: async (id: string, payload: any) => {
    await setDoc(doc(db, 'coupons', id), removeUndefined(payload));
  },
  update: async (id: string, payload: any) => {
    await updateDoc(doc(db, 'coupons', id), removeUndefined(payload));
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'coupons', id));
  }
};
