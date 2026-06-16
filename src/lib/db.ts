import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, orderBy, onSnapshot, limit, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Section, Operation, Transaction } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeToSettings = (userId: string, cb: (data: any) => void) => {
  const docRef = doc(db, `users/${userId}/settings/general`);
  return onSnapshot(docRef, (snapshot) => {
    cb(snapshot.exists() ? snapshot.data() : null);
  }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/settings/general`));
};

export const updateSettings = async (userId: string, data: any) => {
  const path = `users/${userId}/settings/general`;
  try {
    await setDoc(doc(db, path), data, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

// Data fetching helpers
export const subscribeToSections = (userId: string, cb: (data: Section[]) => void) => {
  const q = query(collection(db, `users/${userId}/sections`), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Section)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/sections`));
};

export const subscribeToOperations = (userId: string, sectionId: string, cb: (data: Operation[]) => void) => {
  const q = query(collection(db, `users/${userId}/operations`), where('sectionId', '==', sectionId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Operation)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/operations`));
};

export const subscribeToTransactions = (userId: string, operationId: string, cb: (data: Transaction[]) => void) => {
  const q = query(collection(db, `users/${userId}/transactions`), where('operationId', '==', operationId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/transactions`));
};

export const subscribeToAllTransactions = (userId: string, cb: (data: Transaction[]) => void) => {
  const q = query(collection(db, `users/${userId}/transactions`), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    cb(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
  }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/transactions`));
};

export const createSection = async (userId: string, data: Omit<Section, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
  const path = `users/${userId}/sections`;
  try {
    const newDocRef = doc(collection(db, path));
    const now = Date.now();
    await setDoc(newDocRef, { ...data, userId, createdAt: now, updatedAt: now });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateSection = async (userId: string, sectionId: string, data: Partial<Section>) => {
  const path = `users/${userId}/sections`;
  try {
    const docRef = doc(db, path, sectionId);
    await setDoc(docRef, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteSection = async (userId: string, sectionId: string) => {
  const path = `users/${userId}/sections`;
  try {
    const docRef = doc(db, path, sectionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const createOperation = async (userId: string, data: Omit<Operation, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
  const path = `users/${userId}/operations`;
  try {
    const newDocRef = doc(collection(db, path));
    const now = Date.now();
    await setDoc(newDocRef, { ...data, userId, createdAt: now, updatedAt: now });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateOperation = async (userId: string, operationId: string, data: Partial<Operation>) => {
  const path = `users/${userId}/operations`;
  try {
    const docRef = doc(db, path, operationId);
    await setDoc(docRef, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteOperation = async (userId: string, operationId: string) => {
  const path = `users/${userId}/operations`;
  try {
    const docRef = doc(db, path, operationId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getInvoicePrefix = (operationName: string): string => {
  if (!operationName) return 'TX';
  if (operationName.includes('بيع')) return 'S';
  if (operationName.includes('شراء')) return 'P';
  if (operationName.includes('تيفيت')) return 'M';
  if (operationName.includes('مسحوب')) return 'W';
  if (operationName.includes('تسوية')) return 'ADJ';
  return 'TX';
};

export const getNextInvoiceNumber = async (userId: string): Promise<number> => {
  const path = `users/${userId}/transactions`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    
    for (const docSnapshot of snap.docs) {
      const lastTx = docSnapshot.data();
      const match = (lastTx.invoiceNumber || '').match(/\d+/);
      const lastInv = match ? parseInt(match[0], 10) : 0;
      if (!isNaN(lastInv) && lastInv > 0) {
        return lastInv + 1;
      }
    }
    return 100001;
  } catch (error) {
    console.error("Error getting next invoice number", error);
    return 100001;
  }
};

export const createTransaction = async (userId: string, data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
  const path = `users/${userId}/transactions`;
  try {
    const newDocRef = doc(collection(db, path));
    const now = Date.now();
    await setDoc(newDocRef, { ...data, userId, createdAt: now, updatedAt: now });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateTransaction = async (userId: string, transactionId: string, data: Partial<Transaction>) => {
  const path = `users/${userId}/transactions/${transactionId}`;
  try {
    await setDoc(doc(db, `users/${userId}/transactions`, transactionId), { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteTransaction = async (userId: string, transactionId: string) => {
  const path = `users/${userId}/transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, `users/${userId}/transactions`, transactionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const renumberAllTransactions = async (userId: string, startNumber: number) => {
  const path = `users/${userId}/transactions`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    
    let batch = writeBatch(db);
    let count = 0;
    let currentNumber = startNumber;

    for (const docSnapshot of snap.docs) {
      const data = docSnapshot.data();
      const prefix = getInvoicePrefix(data.operationType || '');
      batch.update(docSnapshot.ref, { invoiceNumber: `${prefix}${currentNumber}`, updatedAt: Date.now() });
      currentNumber++;
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }
    if (count % 400 !== 0) {
      await batch.commit();
    }
    return count;
  } catch (error) {
    console.error("Error renumbering transactions", error);
    throw error;
  }
};
