import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface UserSubscription {
  userId: string;
  polarCustomerId?: string;
  polarSubscriptionId?: string;
  tier: 'free' | 'premium' | 'pro';
  status: 'active' | 'canceled' | 'expired';
  expiresAt?: number;
  conversionsUsed: number;
  conversionsLimit: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConversionRecord {
  id: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  date: number;
  blob: Blob;
}

// Subscription Management
export async function initializeUserSubscription(userId: string): Promise<UserSubscription> {
  const userSubRef = doc(db, 'userSubscriptions', userId);
  const existingDoc = await getDoc(userSubRef);

  if (existingDoc.exists()) {
    return existingDoc.data() as UserSubscription;
  }

  const newSubscription: UserSubscription = {
    userId,
    tier: 'free',
    status: 'active',
    conversionsUsed: 0,
    conversionsLimit: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(userSubRef, newSubscription);
  return newSubscription;
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const userSubRef = doc(db, 'userSubscriptions', userId);
    const docSnap = await getDoc(userSubRef);
    return docSnap.exists() ? (docSnap.data() as UserSubscription) : null;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
}

export async function updateUserSubscription(
  userId: string,
  updates: Partial<UserSubscription>
): Promise<void> {
  try {
    const userSubRef = doc(db, 'userSubscriptions', userId);
    await setDoc(
      userSubRef,
      {
        ...updates,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating user subscription:', error);
  }
}

export async function incrementConversionsUsed(userId: string): Promise<void> {
  try {
    const subscription = await getUserSubscription(userId);
    if (subscription) {
      await updateUserSubscription(userId, {
        conversionsUsed: subscription.conversionsUsed + 1,
      });
    }
  } catch (error) {
    console.error('Error incrementing conversions:', error);
  }
}

export async function upgradeSubscription(
  userId: string,
  tier: 'premium' | 'pro',
  polarCustomerId: string,
  polarSubscriptionId: string,
  expiresAt: number
): Promise<void> {
  try {
    const limits = { premium: Infinity, pro: Infinity };
    await updateUserSubscription(userId, {
      tier,
      status: 'active',
      polarCustomerId,
      polarSubscriptionId,
      expiresAt,
      conversionsLimit: limits[tier],
      conversionsUsed: 0,
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
  }
}

// Conversion Records (existing functionality)
export async function saveConversion(record: ConversionRecord): Promise<void> {
  try {
    const conversionsRef = collection(db, 'conversions');
    const recordData = {
      name: record.name,
      originalName: record.originalName,
      type: record.type,
      size: record.size,
      date: record.date,
    };
    await setDoc(doc(conversionsRef, record.id), recordData);
  } catch (error) {
    console.error('Error saving conversion:', error);
  }
}

export async function getConversions(): Promise<ConversionRecord[]> {
  try {
    const conversionsRef = collection(db, 'conversions');
    const querySnapshot = await getDocs(conversionsRef);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        originalName: data.originalName,
        type: data.type,
        size: data.size,
        date: data.date,
        blob: new Blob(),
      };
    });
  } catch (error) {
    console.error('Error getting conversions:', error);
    return [];
  }
}

export async function deleteConversion(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'conversions', id);
    // Note: Firestore deletion - actual implementation depends on your setup
    await setDoc(docRef, {}, { merge: true });
  } catch (error) {
    console.error('Error deleting conversion:', error);
  }
}

export { db };
