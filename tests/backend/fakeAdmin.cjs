// Minimal in-memory stand-in for firebase-admin (Firestore/Auth/Storage) so the
// real compiled Cloud Function handlers can be executed end-to-end offline.
const store = new Map(); // path -> data
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v, (k, x) => (x && x.__fv ? x : x))));

class FV { constructor(kind, arg) { this.__fv = kind; this.arg = arg; } }
const FieldValue = {
  serverTimestamp: () => new FV('ts'),
  increment: (n) => new FV('inc', n),
  arrayUnion: (...a) => new FV('union', a),
  delete: () => new FV('del'),
};
const Timestamp = { now: () => ({ toMillis: () => Date.now(), toDate: () => new Date() }) };

function applyValue(cur, v) {
  if (v instanceof FV) {
    if (v.__fv === 'ts') return new Date().toISOString();
    if (v.__fv === 'inc') return (typeof cur === 'number' ? cur : 0) + v.arg;
    if (v.__fv === 'union') return [...(Array.isArray(cur) ? cur : []), ...v.arg];
    if (v.__fv === 'del') return undefined;
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out = { ...(cur && typeof cur === 'object' ? cur : {}) };
    for (const [k, x] of Object.entries(v)) { const r = applyValue(out[k], x); if (r === undefined) delete out[k]; else out[k] = r; }
    return out;
  }
  return v;
}
function setPath(obj, path, v) {
  const parts = path.split('.'); let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] && typeof o[parts[i]] === 'object' ? o[parts[i]] : {}; o = o[parts[i]]; }
  const last = parts[parts.length - 1]; const r = applyValue(o[last], v);
  if (r === undefined) delete o[last]; else o[last] = r;
}
function plain(v) { // resolve FieldValues on full set (no merge)
  if (v instanceof FV) return applyValue(undefined, v);
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) { const r = plain(x); if (r !== undefined) o[k] = r; } return o; }
  return v;
}
let autoId = 0;
class DocSnap { constructor(ref, data) { this.ref = ref; this.id = ref.id; this._d = data; this.exists = data !== undefined; } data() { return this._d === undefined ? undefined : JSON.parse(JSON.stringify(this._d)); } get(f) { return this._d?.[f]; } }
class DocRef {
  constructor(path) { this.path = path; this.id = path.split('/').pop(); }
  collection(n) { return new ColRef(`${this.path}/${n}`); }
  async get() { return new DocSnap(this, store.get(this.path)); }
  async set(d, opt) { _set(this, d, opt); }
  async update(d) { _update(this, d); }
  async create(d) { if (store.has(this.path)) { const e = new Error('ALREADY_EXISTS'); e.code = 6; throw e; } _set(this, d); }
  async delete() { store.delete(this.path); }
}
function _set(ref, d, opt) { if (opt?.merge) store.set(ref.path, applyValue(store.get(ref.path) || {}, d)); else store.set(ref.path, plain(d)); }
function _update(ref, d) {
  if (!store.has(ref.path)) { const e = new Error(`NOT_FOUND: no document to update: ${ref.path}`); e.code = 5; throw e; }
  const cur = JSON.parse(JSON.stringify(store.get(ref.path)));
  for (const [k, v] of Object.entries(d)) setPath(cur, k, v);
  store.set(ref.path, cur);
}
class Query {
  constructor(col, filters = [], lim = null, group = false) { this.col = col; this.filters = filters; this.lim = lim; this.group = group; }
  where(f, op, v) { return new Query(this.col, [...this.filters, [f, op, v]], this.lim, this.group); }
  orderBy() { return this; }
  limit(n) { return new Query(this.col, this.filters, n, this.group); }
  async get() {
    let docs = [];
    for (const [p, d] of store.entries()) {
      const parts = p.split('/');
      const parent = parts.slice(0, -1).join('/');
      const match = this.group ? parts[parts.length - 2] === this.col : parent === this.col;
      if (!match) continue;
      const ok = this.filters.every(([f, op, v]) => {
        const x = f.split('.').reduce((o, k) => (o ? o[k] : undefined), d);
        if (op === '==') return x === v; if (op === '!=') return x !== undefined && x !== v; // Firestore excludes missing fields
        if (op === 'in') return v.includes(x); if (op === '<=') return x <= v; if (op === '>=') return x >= v; if (op === '<') return x < v; if (op === '>') return x > v;
        if (op === 'array-contains') return Array.isArray(x) && x.includes(v); return false;
      });
      if (ok) docs.push(new DocSnap(new DocRef(p), d));
    }
    if (this.lim) docs = docs.slice(0, this.lim);
    return { empty: docs.length === 0, size: docs.length, docs, forEach: (f) => docs.forEach(f) };
  }
}
class ColRef extends Query {
  constructor(path) { super(path); this.path = path; }
  doc(id) { return new DocRef(`${this.path}/${id || 'auto' + (++autoId)}`); }
  async add(d) { const r = this.doc(); _set(r, d); return r; }
}
const db = {
  settings() {},
  // transaction-less getAll on db
  collection: (n) => new ColRef(n),
  collectionGroup: (n) => new Query(n, [], null, true),
  doc: (p) => new DocRef(p),
  async getAll(...refs) { return refs.map((r) => new DocSnap(r, store.get(r.path))); },
  batch() { const ops = []; return { set: (r, d, o) => ops.push(() => _set(r, d, o)), update: (r, d) => ops.push(() => _update(r, d)), delete: (r) => ops.push(() => store.delete(r.path)), commit: async () => ops.forEach((f) => f()) }; },
  async runTransaction(fn) {
    const ops = [];
    const t = {
      get: async (x) => (x instanceof DocRef ? x.get() : x.get()),
      getAll: async (...refs) => db.getAll(...refs),
      set: (r, d, o) => { ops.push(() => _set(r, d, o)); return t; },
      update: (r, d) => { ops.push(() => _update(r, d)); return t; },
      delete: (r) => { ops.push(() => store.delete(r.path)); return t; },
    };
    const snapshot = new Map(store);
    try { const res = await fn(t); ops.forEach((f) => f()); return res; } catch (e) { store.clear(); snapshot.forEach((v, k) => store.set(k, v)); throw e; }
  },
};
const users = new Map();
const auth = {
  async createUser(u) { const uid = 'uid_' + (++autoId); users.set(uid, { uid, ...u, metadata: {} }); return users.get(uid); },
  async getUser(uid) { if (!users.has(uid)) { const e = new Error('nf'); e.code = 'auth/user-not-found'; throw e; } return users.get(uid); },
  async getUserByEmail(email) { for (const u of users.values()) if (u.email === email) return u; const e = new Error('nf'); e.code = 'auth/user-not-found'; throw e; },
  async setCustomUserClaims() {}, async updateUser(uid, d) { Object.assign(users.get(uid), d); },
};
const files = new Map();
const storage = { bucket: (name = 'bio-cart.firebasestorage.app') => ({ name, file: (p) => ({ createWriteStream: () => { const { PassThrough } = require('stream'); const s = new PassThrough(); const chunks = []; s.on('data', (c) => chunks.push(c)); s.on('end', () => { files.set(`${name}/${p}`, Buffer.concat(chunks)); setImmediate(() => s.emit('finish')); }); return s; }, save: async (b) => files.set(`${name}/${p}`, b) }) }) };

const firestoreMod = { getFirestore: () => db, FieldValue, Timestamp };
const authMod = { getAuth: () => auth };
const storageMod = { getStorage: () => storage };
const appMod = { getApps: () => (appMod._apps), initializeApp: () => { appMod._apps = [{}]; return {}; }, _apps: [] };
const adminRoot = { initializeApp() {}, firestore: Object.assign(() => db, { FieldValue }), auth: () => auth };
module.exports = { appMod, store, db, files, firestoreMod, authMod, storageMod, adminRoot, users };
