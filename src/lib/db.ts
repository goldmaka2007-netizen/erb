import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
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

// Data fetching helpers
export const subscribeToSections = (userId: string, cb: (data: Section[]) => void) => {
  const q = query(collection(db, `users/${userId}/sections`), orderBy('createdAt', 'desc'));
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
