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

  // Reuse an existing initialized app if available, otherwise initialize
  const existingApp = getApps().at(0);
  const appName = `server-${Date.now()}`;
  console.log(`Initializing Firebase app: ${existingApp ? 'using existing' : 'creating new'}`);
  // Initialize with the constructed config
  const firebaseApp = existingApp ?? initializeApp(config, appName);

  console.log("Initializing server app with auth token...");
  const firebaseServerApp = initializeServerApp(config, { // Pass config here too
    authIdToken,
  });


  const auth = getAuth(firebaseServerApp);
  console.log("Waiting for auth state...");
  await auth.authStateReady();
  console.log("Auth state ready. Current user:", auth.currentUser?.uid || "None");

  return { firebaseServerApp, currentUser: auth.currentUser, firebaseApp };
}

// Optional: Function to get just the server app instance if needed separately
export function getServerFirebaseApp() {
   console.log("getServerFirebaseApp called.");
   const config = buildServerConfigFromEnv(); // Use the function that reads individual vars
   if (!config) {
     throw new Error("Server config not available (Check server logs)");
   }
   const existingApp = getApps().at(0);
   const appName = `server-app-${Date.now()}`;
   return existingApp ?? initializeApp(config, appName);
}

