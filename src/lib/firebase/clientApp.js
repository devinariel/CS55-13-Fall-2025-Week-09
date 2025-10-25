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

let firebaseApp;
try {
	// If an app is already initialized (e.g., during HMR), reuse it
	if (getApps().length > 0) {
		firebaseApp = getApps()[0];
	} else {
		// Try no-arg initializeApp (works on Firebase Hosting)
		firebaseApp = initializeApp();
	}
} catch (err) {
	const cfg = buildConfigFromEnv();
	if (!cfg) throw new Error("Firebase config not found in environment; set NEXT_PUBLIC_FIREBASE_* or FIREBASE_*");
	firebaseApp = initializeApp(cfg);
}

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
