/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc,
  getDocFromServer,
  onSnapshot
} from 'firebase/firestore';
import { Factory, ProductionData } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Detect whether valid credentials are configured
export const isRealFirebase = 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes("Placeholder") && 
  firebaseConfig.projectId !== "";

let app;
let db: any = null;
let auth: any = null;

if (isRealFirebase) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase init failed, falling back to local database:", error);
  }
}

export { db, auth };

// 3. Error Handling (as mandated by firebase-integration skill)
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check Firestore connection on boot if active
if (isRealFirebase && db) {
  async function testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  }
  testConnection();
}

/* ==========================================================================
   UNIFIED STORAGE ENGINE (Real Firebase Firestore OR LocalStorage Fallback)
   ========================================================================== */

const STORAGE_FACTORIES_KEY = "oil_distribution_factories";
const STORAGE_DATA_PREFIX = "oil_distribution_data_";

// Helper for local storage factories
function getLocalFactories(): Factory[] {
  const local = localStorage.getItem(STORAGE_FACTORIES_KEY);
  if (!local) {
    // Inject mock sample factories on first run to give beautiful visual starter data
    const sample: Factory[] = [
      { id: "factory-1", name: "معمل البصرة الشمالي لتجهيز المشتقات", createdAt: new Date().toISOString() },
      { id: "factory-2", name: "مستودع كربلاء الحديث لتوزيع المنتجات", createdAt: new Date().toISOString() },
      { id: "factory-3", name: "مصفى الدورة - منفذ التجهيز الحكومي", createdAt: new Date().toISOString() },
    ];
    localStorage.setItem(STORAGE_FACTORIES_KEY, JSON.stringify(sample));
    
    // Inject demo data for Basra factory
    const basraData: ProductionData = {
      allocated: 3500000,
      carried: 660000,
      days: {
        1: 66000, // 2 trucks
        2: 99000, // 3 trucks
        3: 132000, // 4 trucks
        4: 33000,  // 1 truck
        5: 165000, // 5 trucks
        6: 99000,
        7: 0,
        8: 132000,
        9: 198000,
        10: 99000,
        11: 132000,
        12: 66000,
        13: 33000,
        14: 99000
      },
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_DATA_PREFIX + "factory-1", JSON.stringify(basraData));

    // Inject demo data for Karbala
    const karbalaData: ProductionData = {
      allocated: 2000000,
      carried: 330000,
      days: {
        1: 99000,
        2: 66000,
        3: 33000,
        4: 132000,
        5: 99000,
        6: 33000,
        7: 66000,
        8: 132000,
        9: 66000
      },
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_DATA_PREFIX + "factory-2", JSON.stringify(karbalaData));

    return sample;
  }
  return JSON.parse(local);
}

function getLocalData(factoryId: string): ProductionData {
  const local = localStorage.getItem(STORAGE_DATA_PREFIX + factoryId);
  if (!local) {
    const defaultData: ProductionData = {
      allocated: 0,
      carried: 0,
      days: {},
      updatedAt: new Date().toISOString()
    };
    return defaultData;
  }
  return JSON.parse(local);
}

// Fetch list of all factories
export async function fetchFactories(): Promise<Factory[]> {
  if (isRealFirebase && db) {
    const path = 'factories';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      const res: Factory[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        res.push({
          id: docSnap.id,
          name: d.name || "",
          createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt || new Date().toISOString(),
        });
      });
      // Sort by creation time
      return res.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  } else {
    // LocalStorage fallback
    return getLocalFactories();
  }
}

// Add a new factory unit
export async function createFactory(name: string): Promise<Factory> {
  const cleanId = "fact-" + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();
  
  if (isRealFirebase && db) {
    const path = 'factories';
    try {
      await setDoc(doc(db, path, cleanId), {
        name,
        createdAt: new Date() // Firestore server will translate, or let rules allow client time
      });
      
      // Also initialize empty production data
      await setDoc(doc(db, 'productionData', cleanId), {
        allocated: 0,
        carried: 0,
        days: {},
        updatedAt: new Date()
      });

      return { id: cleanId, name, createdAt: now };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${path}/${cleanId}`);
      throw error;
    }
  } else {
    // LocalStorage fallback
    const list = getLocalFactories();
    const newFact: Factory = { id: cleanId, name, createdAt: now };
    localStorage.setItem(STORAGE_FACTORIES_KEY, JSON.stringify([...list, newFact]));
    return newFact;
  }
}

// Delete a factory
export async function removeFactory(factoryId: string): Promise<void> {
  if (isRealFirebase && db) {
    try {
      await deleteDoc(doc(db, 'factories', factoryId));
      await deleteDoc(doc(db, 'productionData', factoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `factories/${factoryId}`);
    }
  } else {
    const list = getLocalFactories();
    localStorage.setItem(STORAGE_FACTORIES_KEY, JSON.stringify(list.filter(f => f.id !== factoryId)));
    localStorage.removeItem(STORAGE_DATA_PREFIX + factoryId);
  }
}

// Fetch production variables for a given factory and selected month
export async function fetchProductionData(factoryId: string, month: string = "2026-06"): Promise<ProductionData> {
  const docId = month === "2026-06" ? factoryId : `${factoryId}_${month}`;
  if (isRealFirebase && db) {
    const path = `productionData/${docId}`;
    try {
      const docSnap = await getDoc(doc(db, 'productionData', docId));
      if (docSnap.exists()) {
        const d = docSnap.data();
        const rawDays = d.days || {};
        // Convert map keys to numeric string if necessary
        const days: Record<number, number> = {};
        Object.entries(rawDays).forEach(([k, v]) => {
          days[Number(k)] = Number(v) || 0;
        });
        return {
          allocated: Number(d.allocated) || 0,
          carried: Number(d.carried) || 0,
          days,
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() || d.updatedAt || new Date().toISOString()
        };
      } else {
        return { allocated: 0, carried: 0, days: {}, updatedAt: new Date().toISOString() };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  } else {
    return getLocalData(docId);
  }
}

// Write / update production variables under a given factory and selected month
export async function saveProductionData(factoryId: string, data: Partial<ProductionData> & { days: Record<number, number> }, month: string = "2026-06"): Promise<void> {
  const docId = month === "2026-06" ? factoryId : `${factoryId}_${month}`;
  if (isRealFirebase && db) {
    const path = `productionData/${docId}`;
    try {
      // Map needs keys as strings for Firestore
      const firestoreDays: Record<string, number> = {};
      Object.entries(data.days).forEach(([k, v]) => {
        firestoreDays[k] = Number(v) || 0;
      });

      await setDoc(doc(db, 'productionData', docId), {
        allocated: data.allocated ?? 0,
        carried: data.carried ?? 0,
        days: firestoreDays,
        updatedAt: new Date() // Sets current timestamp to satisfy rule condition 'incoming().updatedAt == request.time'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  } else {
    const old = getLocalData(docId);
    const updated: ProductionData = {
      allocated: data.allocated ?? old.allocated,
      carried: data.carried ?? old.carried,
      days: data.days,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_DATA_PREFIX + docId, JSON.stringify(updated));
  }
}
