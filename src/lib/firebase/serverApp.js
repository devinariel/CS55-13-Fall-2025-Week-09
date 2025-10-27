// Ensure this module runs only on the server in Next.js
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
import "server-only";

import { cookies } from "next/headers";
import { initializeServerApp, initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Parses the Firebase config JSON string from the environment variable.
 * @returns {object|null} The Firebase config object or null if the variable is missing/invalid.
 */
function getServerConfig() {
  if (!process.env.FIREBASE_CONFIG) {
    // Log the error for server-side debugging
    console.error("Missing FIREBASE_CONFIG environment variable for server-side initialization.");
    return null;
  }
  try {
    // Directly parse the JSON string provided by App Hosting
    const config = JSON.parse(process.env.FIREBASE_CONFIG);

    // Basic validation (ensure necessary keys are present)
    if (!config.apiKey || !config.projectId) {
      console.error("FIREBASE_CONFIG is missing required properties like apiKey or projectId.");
      return null;
    }
    return config;
  } catch (e) {
    console.error("Failed to parse FIREBASE_CONFIG environment variable:", e);
    return null;
  }
}

// Returns an authenticated Firebase Server App and current user for SSR
export async function getAuthenticatedAppForUser() {
  const config = getServerConfig();
  if (!config) {
    throw new Error(
      "Server-side Firebase initialization failed. Ensure FIREBASE_CONFIG environment variable is set and valid."
    );
  }

  const authIdToken = cookies().get("__session")?.value;

  // Reuse an existing initialized app if available, otherwise initialize
  const existingApp = getApps().at(0);
  const firebaseApp = existingApp ?? initializeApp(config);

  // Note: initializeServerApp should ideally use the config directly if possible,
  // but since we initialize the baseApp first, this structure works.
  const firebaseServerApp = initializeServerApp(config, { // Pass config here too
    authIdToken,
  });


  const auth = getAuth(firebaseServerApp);
  await auth.authStateReady();

  return { firebaseServerApp, currentUser: auth.currentUser, firebaseApp }; // Also return the base app if needed elsewhere
}

// Optional: Export a function to get just the server app instance if needed separately
export function getServerFirebaseApp() {
   const config = getServerConfig();
   if (!config) {
     throw new Error("Server config not available");
   }
   const existingApp = getApps().at(0);
   return existingApp ?? initializeApp(config);
}