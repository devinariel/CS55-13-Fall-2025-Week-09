"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth as getFirebaseAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Try automatic initialization (works when served from Firebase Hosting). If not available
// (for local dev or other hosts), fall back to explicit config from env vars.
// Fallback values from firebase.json for production
function buildConfigFromEnv() {
	const prefix = "NEXT_PUBLIC_";
	
	// Try environment variables first
	let apiKey = process.env[`${prefix}FIREBASE_API_KEY`] || process.env.FIREBASE_API_KEY;
	let authDomain = process.env[`${prefix}FIREBASE_AUTH_DOMAIN`] || process.env.FIREBASE_AUTH_DOMAIN;
	let projectId = process.env[`${prefix}FIREBASE_PROJECT_ID`] || process.env.FIREBASE_PROJECT_ID;
	let storageBucket = process.env[`${prefix}FIREBASE_STORAGE_BUCKET`] || process.env.FIREBASE_STORAGE_BUCKET;
	let messagingSenderId = process.env[`${prefix}FIREBASE_MESSAGING_SENDER_ID`] || process.env.FIREBASE_MESSAGING_SENDER_ID;
	let appId = process.env[`${prefix}FIREBASE_APP_ID`] || process.env.FIREBASE_APP_ID;
	
	// Fallback to hardcoded values from firebase.json if env vars not available
	if (!apiKey) apiKey = "AIzaSyB1XF3ZTH7FmN_V6OOqlz01gKyKRzbbdhA";
	if (!authDomain) authDomain = "the-therapy-compass.firebaseapp.com";
	if (!projectId) projectId = "the-therapy-compass";
	if (!storageBucket) storageBucket = "the-therapy-compass.firebasestorage.app";
	if (!messagingSenderId) messagingSenderId = "489155622257";
	if (!appId) appId = "1:489155622257:web:bf99cea7b388504fee72d0";
	
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
  return initializeApp(config);
}

// Initialize Firebase app - should always succeed with fallback values
let firebaseApp;
try {
  firebaseApp = getClientFirebaseApp();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
  throw error;
}

// Export Firebase services
export const auth = getFirebaseAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// Log auth initialization
if (auth) {
  console.log("Firebase Auth initialized successfully");
} else {
  console.error("Firebase Auth failed to initialize");
}
