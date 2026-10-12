import { 
  db 
} from '../config/firebase';
import { 
  runTransaction, 
  writeBatch, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  orderBy,
  QueryConstraint
} from 'firebase/firestore';
import { normalizeError, retryWithBackoff } from '../utils/errors';

export class FirestoreService {
  /**
   * Run a high-reliability transaction
   */
  static async runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    return retryWithBackoff(async () => {
      try {
        return await runTransaction(db, updateFunction);
      } catch (error) {
        throw normalizeError(error);
      }
    });
  }

  /**
   * Perform safe batch operations
   */
  static createBatch() {
    return writeBatch(db);
  }

  /**
   * High performance generic list fetch with custom query constraints
   */
  static async queryCollection<T>(
    collectionName: string,
    constraints: QueryConstraint[] = [],
    limitCount?: number
  ): Promise<T[]> {
    return retryWithBackoff(async () => {
      try {
        const collRef = collection(db, collectionName);
        const queryConstraints = [...constraints];
        
        if (limitCount) {
          queryConstraints.push(limit(limitCount));
        }

        const q = query(collRef, ...queryConstraints);
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as unknown as T[];
      } catch (error) {
        throw normalizeError(error);
      }
    });
  }

  /**
   * Simple lookup by single field
   */
  static async findByField<T>(
    collectionName: string,
    fieldName: string,
    value: any
  ): Promise<T[]> {
    return this.queryCollection<T>(collectionName, [where(fieldName, '==', value)]);
  }
}
