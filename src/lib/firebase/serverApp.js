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
  const firebaseConfigEnvVar = process.env.FIREBASE_CONFIG; // Store in a variable

  // --- START DEBUG LOGGING ---
  console.log("Attempting to read FIREBASE_CONFIG env var.");
  if (!firebaseConfigEnvVar) {
    console.error("FIREBASE_CONFIG environment variable is MISSING or empty.");
    return null;
  }
  console.log("Raw FIREBASE_CONFIG value:", firebaseConfigEnvVar);
  // --- END DEBUG LOGGING ---

  try {
    // Directly parse the JSON string provided by App Hosting
    const config = JSON.parse(firebaseConfigEnvVar);
    console.log("Parsed FIREBASE_CONFIG object:", JSON.stringify(config)); // Log the parsed object

    // Basic validation (ensure necessary keys are present)
    if (!config.apiKey || !config.projectId) {
      console.error(
        "FIREBASE_CONFIG is missing required properties like apiKey or projectId. Parsed object keys:",
        Object.keys(config) // Log the keys that *were* found
      );
      return null;
    }
    console.log("FIREBASE_CONFIG seems valid.");
    return config;
  } catch (e) {
    console.error("Failed to parse FIREBASE_CONFIG environment variable as JSON:", e);
    // Log the raw value again on parse failure
    console.error("Raw value that failed parsing:", firebaseConfigEnvVar);
    return null;
  }
}

// Returns an authenticated Firebase Server App and current user for SSR
export async function getAuthenticatedAppForUser() {
  console.log("getAuthenticatedAppForUser called."); // Log entry point
  const config = getServerConfig();
  if (!config) {
    // Error is thrown here if getServerConfig returns null
    throw new Error(
      "Server-side Firebase initialization failed. Ensure FIREBASE_CONFIG environment variable is set and valid (Check server logs for details)."
    );
  }

  const authIdToken = cookies().get("__session")?.value;

  // Reuse an existing initialized app if available, otherwise initialize
  const existingApp = getApps().at(0);
  const appName = `server-${Date.now()}`; // Give server apps unique names
  console.log(`Initializing Firebase app: ${existingApp ? 'using existing' : 'creating new'}`);
  const firebaseApp = existingApp ?? initializeApp(config, appName);

  console.log("Initializing server app with auth token...");
  const firebaseServerApp = initializeServerApp(config, {
    authIdToken,
  });


  const auth = getAuth(firebaseServerApp);
  console.log("Waiting for auth state...");
  await auth.authStateReady();
  console.log("Auth state ready. Current user:", auth.currentUser?.uid || "None");

  return { firebaseServerApp, currentUser: auth.currentUser, firebaseApp };
}

// Optional: Export a function to get just the server app instance if needed separately
export function getServerFirebaseApp() {
   console.log("getServerFirebaseApp called."); // Log entry point
   const config = getServerConfig();
   if (!config) {
     throw new Error("Server config not available (Check server logs for details)");
   }
   const existingApp = getApps().at(0);
    const appName = `server-app-${Date.now()}`; // Unique name
   return existingApp ?? initializeApp(config, appName);
}