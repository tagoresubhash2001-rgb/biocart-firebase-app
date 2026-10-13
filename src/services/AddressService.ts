import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { AddressEntity, AddressEntitySchema } from '../types/backend';
import { normalizeError } from '../utils/errors';

export class AddressService {
  /**
   * Fetch all saved addresses for a given user
   */
  static async getUserAddresses(userId: string): Promise<AddressEntity[]> {
    if (!userId) return [];
    try {
      const q = query(collection(db, 'addresses'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const addresses: AddressEntity[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        addresses.push({
          id: docSnap.id,
          userId: data.userId,
          addressType: data.addressType || 'shipping',
          name: data.name || '',
          street: data.street || '',
          city: data.city || '',
          state: data.state || '',
          postalCode: data.postalCode || '',
          country: data.country || 'India',
          phone: data.phone || '',
          isDefault: !!data.isDefault,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          createdBy: data.createdBy || userId,
          updatedBy: data.updatedBy || userId,
          status: data.status || 'active',
          isDeleted: !!data.isDeleted,
          version: data.version || 1
        });
      });
      // Sort default address first, then by createdAt desc
      addresses.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return addresses;
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Add or save a user address
   */
  static async saveAddress(address: Partial<AddressEntity> & { userId: string }): Promise<string> {
    try {
      const isNew = !address.id;
      const addressRef = isNew ? doc(collection(db, 'addresses')) : doc(db, 'addresses', address.id!);
      const addressId = addressRef.id;

      const now = new Date().toISOString();
      const entity: AddressEntity = {
        id: addressId,
        userId: address.userId,
        addressType: address.addressType || 'shipping',
        name: address.name?.trim() || '',
        street: address.street?.trim() || '',
        city: address.city?.trim() || '',
        state: address.state?.trim() || '',
        postalCode: address.postalCode?.trim() || '',
        country: address.country?.trim() || 'India',
        phone: address.phone?.trim() || '',
        isDefault: !!address.isDefault,
        createdAt: address.createdAt || now,
        updatedAt: now,
        createdBy: address.createdBy || address.userId,
        updatedBy: address.userId,
        status: 'active',
        isDeleted: false,
        version: (address.version || 0) + 1
      };

      // Validate schema
      AddressEntitySchema.parse(entity);

      // If set as default, unset other addresses
      if (entity.isDefault) {
        const batch = writeBatch(db);
        const q = query(
          collection(db, 'addresses'), 
          where('userId', '==', entity.userId), 
          where('isDefault', '==', true)
        );
        const existingDefaultSnap = await getDocs(q);
        existingDefaultSnap.forEach(d => {
          if (d.id !== addressId) {
            batch.update(d.ref, { isDefault: false, updatedAt: now });
          }
        });
        batch.set(addressRef, entity);
        await batch.commit();
      } else {
        await setDoc(addressRef, entity);
      }

      return addressId;
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Set an address as the default address
   */
  static async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);
      
      const q = query(collection(db, 'addresses'), where('userId', '==', userId));
      const snap = await getDocs(q);
      
      snap.forEach(d => {
        batch.update(d.ref, { 
          isDefault: d.id === addressId,
          updatedAt: now
        });
      });

      await batch.commit();
    } catch (err) {
      throw normalizeError(err);
    }
  }

  /**
   * Delete an address
   */
  static async deleteAddress(addressId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'addresses', addressId));
    } catch (err) {
      throw normalizeError(err);
    }
  }
}
export default AddressService;
