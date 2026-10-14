/**
 * Firestore Utilities: Data Sanitization and Type Safety
 * 
 * Firestore JavaScript SDK throws a runtime error if ANY property contains `undefined`.
 * Optional fields must be stripped cleanly before setDoc, updateDoc, or toFirestore calls.
 */

export function removeUndefined<T>(val: T): T {
  if (val === null || val === undefined) {
    return val;
  }

  // Preserve primitive types
  if (typeof val !== 'object') {
    return val;
  }

  // Preserve Date instances
  if (val instanceof Date) {
    return val;
  }

  // Preserve Firestore FieldValues (serverTimestamp, deleteField, arrayUnion, etc.)
  // or Firestore Timestamps with toMillis/toDate
  if (
    ('_methodName' in (val as any)) ||
    ('toMillis' in (val as any) && typeof (val as any).toMillis === 'function') ||
    ('toDate' in (val as any) && typeof (val as any).toDate === 'function')
  ) {
    return val;
  }

  // Handle arrays: filter out undefined items and recursively sanitize members
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => removeUndefined(item)) as unknown as T;
  }

  // Handle plain objects: omit keys with undefined values
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(val as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = typeof value === 'object' && value !== null ? removeUndefined(value) : value;
    }
  }

  return result as T;
}

export default removeUndefined;
