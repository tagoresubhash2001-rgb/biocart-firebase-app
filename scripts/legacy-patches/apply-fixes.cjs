const fs = require('fs');

// FIX 1: src/hooks/useVendor.ts
let useVendorContent = `import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function useVendor() {
  const { userProfile } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) {
      setLoading(false);
      return;
    }
    const fetchVendor = async () => {
      try {
        const q = query(collection(db, 'vendors'), where('ownerUid', '==', userProfile.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setVendorId(snap.docs[0].id);
        }
      } catch (err) {
        console.error('Error fetching vendor:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [userProfile?.uid]);

  return { vendorId, loading, user: userProfile };
}
`;
fs.writeFileSync('src/hooks/useVendor.ts', useVendorContent);
console.log('FIX 1 applied');

// FIX 2: functions/src/index.ts
let functionsIndex = fs.readFileSync('functions/src/index.ts', 'utf8');
const oldFuncRegex = /export const createVendorAccount = functions\.https\.onCall\(async \(data, context\) => \{[\s\S]*?\}\);/m;
const newFunc = `function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out + '!1';
}

export const createVendorAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const callerUid = context.auth.uid;
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.data();

  if (!callerData || (callerData.role !== 'admin' && callerData.role !== 'super_admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create vendors');
  }

  const { businessName, commissionPercent, ownerName, email, phone } = data;

  if (!businessName || !email) {
    throw new functions.https.HttpsError('invalid-argument', 'businessName and email are required');
  }

  // 1. Actually create the Firebase Auth login — this was the missing step.
  //    Without this, there was never any real account for a vendor to log into.
  const tempPassword = generateTempPassword();
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName: ownerName || businessName
    });
  } catch (err: any) {
    throw new functions.https.HttpsError('already-exists', \`Could not create vendor login: \${err.message}\`);
  }
  const ownerUid = userRecord.uid;

  // 2. Assign role
  await db.collection('users').doc(ownerUid).set({
    uid: ownerUid,
    email,
    name: ownerName || businessName,
    role: 'vendor',
    status: 'active'
  }, { merge: true });

  // 3. Create vendor document, correctly linked via ownerUid
  const vendorRef = db.collection('vendors').doc();
  await vendorRef.set({
    ownerUid,
    businessName,
    ownerName: ownerName || 'Unknown',
    email,
    phone: phone || '',
    commissionPercent: commissionPercent || 15,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { vendorId: vendorRef.id, ownerUid, email, tempPassword };
});`;

functionsIndex = functionsIndex.replace(oldFuncRegex, newFunc);
fs.writeFileSync('functions/src/index.ts', functionsIndex);
console.log('FIX 2 applied');

// FIX 3: src/components/admin/AdminVendors.tsx
let adminVendors = fs.readFileSync('src/components/admin/AdminVendors.tsx', 'utf8');

const oldImports = `import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { VendorItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  Store, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertOctagon, 
  Edit3, 
  X, 
  Percent, 
  Sparkles
} from 'lucide-react';

export const AdminVendors: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [editingVendor, setEditingVendor] = useState<Partial<VendorItem> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);`;

const newImports = `import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../config/firebase';
import { AdminService } from '../../services/AdminService';
import { VendorItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  Store, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertOctagon, 
  Edit3, 
  X, 
  Percent, 
  Sparkles,
  KeyRound,
  Copy
} from 'lucide-react';

const functions = getFunctions(app);
const createVendorAccountCF = httpsCallable(functions, 'createVendorAccount');

export const AdminVendors: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [editingVendor, setEditingVendor] = useState<Partial<VendorItem> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newVendorCreds, setNewVendorCreds] = useState<{ email: string; tempPassword: string } | null>(null);`;

adminVendors = adminVendors.replace(oldImports, newImports);

const oldSave = `  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor || !editingVendor.businessName) return;
    try {
      await AdminService.saveVendor(editingVendor, actor);
      addToast(\`Vendor "\${editingVendor.businessName}" saved successfully\`, 'success');
      setIsModalOpen(false);
      setEditingVendor(null);
    } catch (err: any) {
      addToast('Failed to save vendor', 'warning');
    }
  };`;

const newSave = `  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor || !editingVendor.businessName) return;
    setIsSaving(true);
    try {
      if (!editingVendor.id) {
        // NEW vendor — this now actually creates a real, linked Firebase Auth
        // login via the Cloud Function, instead of just writing a directory
        // entry nobody could ever log into.
        if (!editingVendor.email) {
          addToast('Email is required to create a vendor login', 'warning');
          setIsSaving(false);
          return;
        }
        const result: any = await createVendorAccountCF({
          businessName: editingVendor.businessName,
          ownerName: editingVendor.ownerName || '',
          email: editingVendor.email,
          phone: editingVendor.phone || '',
          commissionPercent: editingVendor.commissionPercent ?? 10
        });
        setNewVendorCreds({ email: result.data.email, tempPassword: result.data.tempPassword });
        addToast(\`Vendor "\${editingVendor.businessName}" created with a login\`, 'success');
      } else {
        await AdminService.saveVendor(editingVendor, actor);
        addToast(\`Vendor "\${editingVendor.businessName}" updated\`, 'success');
      }
      setIsModalOpen(false);
      setEditingVendor(null);
    } catch (err: any) {
      addToast(err?.message || 'Failed to save vendor', 'warning');
    } finally {
      setIsSaving(false);
    }
  };`;

adminVendors = adminVendors.replace(oldSave, newSave);

const gridRegex = /(<div className="grid grid-cols-1 md:grid-cols-2 gap-4">)/;
const newBanner = `      {newVendorCreds && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-4">
          <KeyRound className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-grow text-xs">
            <p className="font-bold text-amber-800 mb-1">Save these vendor login credentials now — the temp password won't be shown again.</p>
            <p className="text-amber-700">Email: <span className="font-mono">{newVendorCreds.email}</span></p>
            <p className="text-amber-700">Temp Password: <span className="font-mono">{newVendorCreds.tempPassword}</span></p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(\`Email: \${newVendorCreds.email}\\nTemp Password: \${newVendorCreds.tempPassword}\`); addToast('Copied', 'success'); }}
            className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={() => setNewVendorCreds(null)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      $1`;
adminVendors = adminVendors.replace(gridRegex, newBanner);

const btnRegex = /<button\s+type="submit"\s+className="px-4 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800"\s*>\s*Save Vendor\s*<\/button>/;
const newBtn = `<button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-charcoal-800 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Vendor'}
              </button>`;
adminVendors = adminVendors.replace(btnRegex, newBtn);

fs.writeFileSync('src/components/admin/AdminVendors.tsx', adminVendors);
console.log('FIX 3 applied');

// FIX 4: src/types/backend.ts
let backendTypes = fs.readFileSync('src/types/backend.ts', 'utf8');
backendTypes = backendTypes.replace(
  /role: z\.enum\(\['super_admin', 'admin', 'manager', 'customer', 'guest'\] as const\),/,
  "role: z.enum(['super_admin', 'admin', 'manager', 'customer', 'guest', 'vendor'] as const),"
);
fs.writeFileSync('src/types/backend.ts', backendTypes);
console.log('FIX 4 applied');
