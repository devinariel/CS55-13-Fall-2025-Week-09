// Ensure this module runs only on the server in Next.js
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
import "server-only";

import { cookies } from "next/headers";
import { initializeServerApp, initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Reads individual TTC_FIREBASE_* environment variables set by secrets
function buildServerConfigFromEnv() {
  console.log("Building server config from individual TTC_FIREBASE_* ENV variables...");
  // Use the new TTC_ prefix
  const apiKey = process.env.TTC_FIREBASE_API_KEY;
  const authDomain = process.env.TTC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.TTC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.TTC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.TTC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.TTC_FIREBASE_APP_ID;

  // Log found values for debugging
  console.log(`TTC_FIREBASE_API_KEY found: ${!!apiKey}`);
  console.log(`TTC_FIREBASE_PROJECT_ID found: ${!!projectId}`);
  console.log(`TTC_FIREBASE_AUTH_DOMAIN found: ${!!authDomain}`);
  console.log(`TTC_FIREBASE_STORAGE_BUCKET found: ${!!storageBucket}`);
  console.log(`TTC_FIREBASE_MESSAGING_SENDER_ID found: ${!!messagingSenderId}`);
  console.log(`TTC_FIREBASE_APP_ID found: ${!!appId}`);


  // Critical validation
  if (!apiKey || !projectId) {
      console.error("Missing critical TTC_FIREBASE_API_KEY or TTC_FIREBASE_PROJECT_ID env var. Check App Hosting secrets.");
      return null;
  }

  // Construct the config object (only include defined values)
  const config = { apiKey, projectId };
  if (authDomain) config.authDomain = authDomain;
  if (storageBucket) config.storageBucket = storageBucket;
  if (messagingSenderId) config.messagingSenderId = messagingSenderId;
  if (appId) config.appId = appId;

  console.log("Constructed Firebase Config:", JSON.stringify(config));
  return config;
}

// Returns an authenticated Firebase Server App and current user for SSR
export async function getAuthenticatedAppForUser() {
  console.log("getAuthenticatedAppForUser called.");
  const config = buildServerConfigFromEnv(); // Use the function that reads individual vars
  if (!config) {
    throw new Error(
      "Server-side Firebase initialization failed. Ensure required TTC_FIREBASE_* environment variables (from secrets) are set and accessible. Check server logs."
    );
  }

  const authIdToken = cookies().get("__session")?.value;

  // Use the improved function to get the app instance
  const firebaseApp = getServerFirebaseApp();

  console.log("Initializing server app with auth token...");
  // Use a unique app name for the server-side instance to avoid conflicts
  const appName = `server-auth-${Date.now()}`;
  const firebaseServerApp = initializeServerApp(
    config,
    { authIdToken },
    appName
  );
  
  const auth = getAuth(firebaseServerApp);
  console.log("Waiting for auth state...");
  await auth.authStateReady();
  console.log("Auth state ready. Current user:", auth.currentUser?.uid || "None");

  return { firebaseServerApp, currentUser: auth.currentUser, firebaseApp };
}

// Optional: Function to get just the server app instance if needed separately
export function getServerFirebaseApp() {  
  if (getApps().length) {
    console.log("getServerFirebaseApp: Using existing app.");
    return getApps()[0];
  }

  console.log("getServerFirebaseApp: Initializing new app.");
  const config = buildServerConfigFromEnv();
  if (!config) {
    throw new Error("Server config not available (Check server logs)");
  }

  return initializeApp(config);
}
