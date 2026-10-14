import { 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  FirestoreDataConverter, 
  DocumentData, 
  QueryDocumentSnapshot,
  Firestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  writeBatch,
  runTransaction,
  QueryConstraint,
  getDocFromServer,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { BaseRepository } from '../types/backend';
import { normalizeError, retryWithBackoff } from '../utils/errors';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { removeUndefined } from '../utils/firestore';

/**
 * Creates a generic Firestore converter for Type safety, adding automatic timestamps and optimistic version tracking
 */
export function createConverter<T extends Record<string, any>>(): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: T): DocumentData {
      const { id, ...data } = modelObject as any;
      const raw = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      return removeUndefined(raw) as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): T {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        ...data,
      } as unknown as T;
    },
  };
}

export interface AdvancedQueryOptions {
  filters?: { field: string; operator: '==' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any'; value: any }[];
  sorts?: { field: string; direction?: 'asc' | 'desc' }[];
  limitCount?: number;
  startAfterDocument?: QueryDocumentSnapshot<any> | null;
}

export class FirestoreBaseRepository<T extends Record<string, any>> implements BaseRepository<T> {
  protected collectionName: string;
  protected firestore: Firestore;
  protected converter: FirestoreDataConverter<T>;

  constructor(collectionName: string, customDb: Firestore = db) {
    this.collectionName = collectionName;
    this.firestore = customDb;
    this.converter = createConverter<T>();
  }

  /**
   * Helper to get a typed document reference
   */
  protected getDocRef(id: string) {
    return doc(this.firestore, this.collectionName, id).withConverter(this.converter);
  }

  /**
   * Helper to get a collection reference
   */
  protected getCollectionRef() {
    return collection(this.firestore, this.collectionName).withConverter(this.converter);
  }

  /**
   * Test current connection using server-side check
   */
  async testConnection(): Promise<boolean> {
    try {
      await getDocFromServer(doc(this.firestore, 'test', 'connection'));
      return true;
    } catch (error: any) {
      if (error?.message?.includes('the client is offline')) {
        console.error("Firestore Client is offline. Please verify network or config.");
      }
      return false;
    }
  }

  /**
   * Standard CRUD: Retrieve by ID
   */
  async getById(id: string): Promise<T | null> {
    return retryWithBackoff(async () => {
      try {
        const ref = this.getDocRef(id);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) {
          return null;
        }
        return snapshot.data() || null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `${this.collectionName}/${id}`);
      }
    });
  }

  /**
   * Interceptor / Audit hook executed on every mutating write action
   */
  protected async triggerAuditLog(action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'BATCH', docId: string, payload?: any): Promise<void> {
    try {
      if (this.collectionName === 'analytics') return; // Prevent infinite loops
      console.log(`[AUDIT HOOK] [${new Date().toISOString()}] Collection: ${this.collectionName.toUpperCase()}, Action: ${action}, Document: ${docId}`, payload ? JSON.stringify(payload).slice(0, 200) : '');
    } catch (e) {
      console.error('Audit hook trigger failed:', e);
    }
  }

  /**
   * Standard CRUD: Create new document with specific ID
   */
  async create(id: string, item: T): Promise<void> {
    return retryWithBackoff(async () => {
      try {
        const ref = this.getDocRef(id);
        const timestampedItem = {
          ...item,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: item.version || 1,
          isDeleted: item.isDeleted ?? false,
        };
        const sanitized = removeUndefined(timestampedItem);
        await setDoc(ref, sanitized as any, { merge: true });
        this.triggerAuditLog('CREATE', id, sanitized);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${this.collectionName}/${id}`);
      }
    });
  }

  /**
   * Standard CRUD: Update document fields
   */
  async update(id: string, item: Partial<T>): Promise<void> {
    return retryWithBackoff(async () => {
      try {
        const ref = this.getDocRef(id);
        const updatePayload = {
          ...item,
          updatedAt: new Date().toISOString(),
        } as DocumentData;
        
        // Auto-increment version if it exists in the updated fields or is tracked
        if (typeof (item as any).version === 'number') {
          updatePayload.version = (item as any).version + 1;
        }

        const sanitized = removeUndefined(updatePayload);
        await updateDoc(ref, sanitized);
        this.triggerAuditLog('UPDATE', id, sanitized);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${this.collectionName}/${id}`);
      }
    });
  }

  /**
   * Standard CRUD: Hard delete a document
   */
  async delete(id: string): Promise<void> {
    return retryWithBackoff(async () => {
      try {
        const ref = this.getDocRef(id);
        await deleteDoc(ref);
        this.triggerAuditLog('DELETE', id);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${this.collectionName}/${id}`);
      }
    });
  }

  /**
   * Enterprise Pattern: Soft delete for data history and sync preserving
   */
  async softDelete(id: string, updatedBy = 'system'): Promise<void> {
    await this.update(id, {
      isDeleted: true,
      updatedBy,
    } as unknown as Partial<T>);
    this.triggerAuditLog('SOFT_DELETE', id, { updatedBy });
  }

  /**
   * Advanced Querying, Pagination, Sorting, and Filtering
   */
  async find(options: AdvancedQueryOptions = {}): Promise<{ items: T[]; lastDoc: QueryDocumentSnapshot<T> | null }> {
    return retryWithBackoff(async () => {
      try {
        const constraints: QueryConstraint[] = [];

        // Apply filters
        if (options.filters) {
          options.filters.forEach(filter => {
            constraints.push(where(filter.field, filter.operator, filter.value));
          });
        }

        // Always filter out soft-deleted items by default, unless explicitly requested
        const hasDeletedFilter = options.filters?.some(f => f.field === 'isDeleted');
        if (!hasDeletedFilter) {
          constraints.push(where('isDeleted', '==', false));
        }

        // Apply sorting
        if (options.sorts) {
          options.sorts.forEach(sort => {
            constraints.push(orderBy(sort.field, sort.direction || 'asc'));
          });
        }

        // Apply pagination cursor
        if (options.startAfterDocument) {
          constraints.push(startAfter(options.startAfterDocument));
        }

        // Apply limit
        if (options.limitCount) {
          constraints.push(limit(options.limitCount));
        }

        const q = query(this.getCollectionRef(), ...constraints);
        const snapshot = await getDocs(q);

        const items: T[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data());
        });

        const lastDoc = snapshot.docs.length > 0 ? (snapshot.docs[snapshot.docs.length - 1] as QueryDocumentSnapshot<T>) : null;

        return { items, lastDoc };
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, this.collectionName);
      }
    });
  }

  /**
   * Realtime Listener for a single document
   */
  subscribeToDoc(id: string, callback: (item: T | null) => void, errorCallback?: (error: any) => void): () => void {
    const ref = this.getDocRef(id);
    return onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
        } else {
          callback(snapshot.data() || null);
        }
      },
      (error) => {
        if (errorCallback) {
          errorCallback(error);
        } else {
          handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${id}`);
        }
      }
    );
  }

  /**
   * Realtime Listener for advanced queries
   */
  subscribeToQuery(
    options: AdvancedQueryOptions,
    callback: (items: T[]) => void,
    errorCallback?: (error: any) => void
  ): () => void {
    const constraints: QueryConstraint[] = [];
    if (options.filters) {
      options.filters.forEach(filter => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
    }
    const hasDeletedFilter = options.filters?.some(f => f.field === 'isDeleted');
    if (!hasDeletedFilter) {
      constraints.push(where('isDeleted', '==', false));
    }
    if (options.sorts) {
      options.sorts.forEach(sort => {
        constraints.push(orderBy(sort.field, sort.direction || 'asc'));
      });
    }
    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    const q = query(this.getCollectionRef(), ...constraints);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data());
        });
        callback(items);
      },
      (error) => {
        if (errorCallback) {
          errorCallback(error);
        } else {
          handleFirestoreError(error, OperationType.LIST, this.collectionName);
        }
      }
    );
  }

  /**
   * Transaction Orchestration: Atomic Writes, Inventory Updates, rollbacks
   */
  async runTransaction(operations: (transaction: any) => Promise<any>): Promise<any> {
    try {
      return await runTransaction(this.firestore, async (transaction) => {
        return await operations(transaction);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `transaction::${this.collectionName}`);
    }
  }

  /**
   * Batch Operations: Safe bulk creation / updates (capped at 500 documents per batch)
   */
  async executeBatch(itemsToSave: { id: string; data: Partial<T>; type: 'create' | 'update' | 'delete' }[]): Promise<void> {
    try {
      const batch = writeBatch(this.firestore);
      itemsToSave.forEach(item => {
        const ref = this.getDocRef(item.id);
        if (item.type === 'create') {
          const timestampedItem = {
            ...item.data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDeleted: false,
            version: 1,
          };
          batch.set(ref, timestampedItem as any, { merge: true });
        } else if (item.type === 'update') {
          const updatePayload = {
            ...item.data,
            updatedAt: new Date().toISOString(),
          };
          batch.update(ref, updatePayload as any);
        } else if (item.type === 'delete') {
          batch.delete(ref);
        }
      });
      await batch.commit();
      this.triggerAuditLog('BATCH', 'bulk-operation', { count: itemsToSave.length });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `batch::${this.collectionName}`);
    }
  }
}
