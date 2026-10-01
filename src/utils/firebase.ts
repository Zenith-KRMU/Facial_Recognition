import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { RegisteredFace } from '../types';
import { saveEnrolledFace, deleteEnrolledFace, getEnrolledFaces } from './faceRecognition';

export interface FirebaseConfigOptions {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const FIREBASE_STORAGE_KEY = 'REALTIME_CV_FIREBASE_CONFIG';

// Default config from import.meta.env or localStorage
export function getStoredFirebaseConfig(): FirebaseConfigOptions | null {
  try {
    const raw = localStorage.getItem(FIREBASE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored Firebase config:', e);
  }

  // Fallback to Vite env variables if provided
  const envApiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
  const envProjectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      projectId: envProjectId,
      authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
    };
  }

  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfigOptions) {
  try {
    localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(config));
    // Reset app instance to re-initialize with new config
    cachedApp = null;
    cachedDb = null;
  } catch (e) {
    console.warn('Failed to save Firebase config to localStorage:', e);
  }
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseInstance(): { app: FirebaseApp | null; db: Firestore | null } {
  if (cachedApp && cachedDb) {
    return { app: cachedApp, db: cachedDb };
  }

  const config = getStoredFirebaseConfig();
  if (!config) {
    return { app: null, db: null };
  }

  try {
    const existingApps = getApps();
    cachedApp = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
    cachedDb = getFirestore(cachedApp);
    return { app: cachedApp, db: cachedDb };
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err);
    return { app: null, db: null };
  }
}

/**
 * Subscribes to the real-time community face registry in Firebase Firestore.
 * Automatically synchronizes with local recognition engine.
 */
export function subscribeToCommunityFaces(
  onUpdate: (faces: RegisteredFace[]) => void
): Unsubscribe | null {
  const { db } = getFirebaseInstance();

  if (!db) {
    // Return local enrolled faces when Firebase is not connected yet
    onUpdate(getEnrolledFaces());
    return null;
  }

  try {
    const facesRef = collection(db, 'community_enrolled_faces');
    const q = query(facesRef, orderBy('enrolledAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cloudFaces: RegisteredFace[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudFaces.push({
            id: docSnap.id,
            name: data.name || 'Unnamed Citizen',
            role: data.role || 'Community Member',
            status: data.status || 'REGISTERED',
            embedding: data.embedding || [],
            faceCropUrl: data.faceCropUrl || '',
            enrolledAt: data.enrolledAt || new Date().toISOString(),
            notes: data.notes || '',
          });
        });

        // Sync with local recognition memory
        cloudFaces.forEach((f) => saveEnrolledFace(f));
        onUpdate(cloudFaces);
        console.log(`[Firebase Firestore] Synced ${cloudFaces.length} open community enrolled faces in real-time.`);
      },
      (err) => {
        console.warn('[Firebase Firestore] onSnapshot error:', err);
        onUpdate(getEnrolledFaces());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase Firestore] Failed to subscribe:', err);
    onUpdate(getEnrolledFaces());
    return null;
  }
}

/**
 * Open Community Enrollment: Any citizen or user can enter their name
 * to save their facial biometric data into Firebase Firestore.
 * No admin required — completely open for the public.
 */
export async function enrollPersonInCommunity(data: {
  id?: string;
  name: string;
  role?: string;
  status?: 'REGISTERED' | 'WATCHLIST_FLAG';
  embedding: number[];
  faceCropUrl?: string;
  notes?: string;
}): Promise<{ success: boolean; id: string; source: 'FIREBASE' | 'LOCAL' }> {
  const faceId = data.id || `face-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const enrolledRecord: RegisteredFace = {
    id: faceId,
    name: data.name.trim(),
    role: data.role?.trim() || 'Community Member',
    status: data.status || 'REGISTERED',
    embedding: data.embedding,
    faceCropUrl: data.faceCropUrl || '',
    enrolledAt: new Date().toISOString(),
    notes: data.notes?.trim() || 'Open Community Registration',
  };

  // 1. Immediately save to local recognition cache so current device identifies them instantly
  saveEnrolledFace(enrolledRecord);

  // 2. Also sync to Python Flask Backend if available (PostgreSQL)
  try {
    fetch('/api/v1/faces/enrolled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrolledRecord),
    }).catch(() => {
      // Flask backend offline or local-only mode
    });
  } catch {
    // ignore
  }

  // 3. Save to Firebase Firestore if connected
  const { db } = getFirebaseInstance();
  if (db) {
    try {
      const docRef = doc(db, 'community_enrolled_faces', faceId);
      await setDoc(docRef, {
        ...enrolledRecord,
        updatedAt: new Date().toISOString(),
        deviceType: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device',
        isOpenCommunity: true,
      });
      console.log(`[Firebase] Successfully enrolled ${enrolledRecord.name} into Firestore!`);
      return { success: true, id: faceId, source: 'FIREBASE' };
    } catch (err) {
      console.warn('[Firebase] Firestore setDoc failed, saved locally:', err);
      return { success: true, id: faceId, source: 'LOCAL' };
    }
  }

  return { success: true, id: faceId, source: 'LOCAL' };
}

/**
 * Delete enrolled face from Firebase and local cache
 */
export async function deletePersonFromCommunity(faceId: string): Promise<boolean> {
  deleteEnrolledFace(faceId);

  // Sync to Flask if running
  try {
    fetch(`/api/v1/faces/enrolled/${faceId}`, { method: 'DELETE' }).catch(() => {});
  } catch {
    // ignore
  }

  const { db } = getFirebaseInstance();
  if (db) {
    try {
      await deleteDoc(doc(db, 'community_enrolled_faces', faceId));
      return true;
    } catch (err) {
      console.warn('[Firebase] Failed to delete from Firestore:', err);
    }
  }
  return true;
}
