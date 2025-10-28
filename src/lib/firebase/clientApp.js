"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Try automatic initialization (works when served from Firebase Hosting). If not available
// (for local dev or other hosts), fall back to explicit config from env vars.
function buildConfigFromEnv() {
	const prefix = "NEXT_PUBLIC_";
	const apiKey = process.env[`${prefix}FIREBASE_API_KEY`] || process.env.FIREBASE_API_KEY;
	const authDomain = process.env[`${prefix}FIREBASE_AUTH_DOMAIN`] || process.env.FIREBASE_AUTH_DOMAIN;
	const projectId = process.env[`${prefix}FIREBASE_PROJECT_ID`] || process.env.FIREBASE_PROJECT_ID;
	const storageBucket = process.env[`${prefix}FIREBASE_STORAGE_BUCKET`] || process.env.FIREBASE_STORAGE_BUCKET;
	const messagingSenderId = process.env[`${prefix}FIREBASE_MESSAGING_SENDER_ID`] || process.env.FIREBASE_MESSAGING_SENDER_ID;
	const appId = process.env[`${prefix}FIREBASE_APP_ID`] || process.env.FIREBASE_APP_ID;
	if (!apiKey || !projectId) return null;
	return {
		apiKey,
		authDomain,
		projectId,
		storageBucket,
		messagingSenderId,
		appId,
	};
}

function getClientFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  const config = buildConfigFromEnv();
  if (!config) throw new Error("Firebase config not found in environment; set NEXT_PUBLIC_FIREBASE_* or FIREBASE_*");
  return initializeApp(config);
}

const firebaseApp = getClientFirebaseApp();
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
