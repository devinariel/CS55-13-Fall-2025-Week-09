// Ensure this module runs only on the server in Next.js
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
import "server-only";

import { cookies } from "next/headers";
import { initializeServerApp, initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

function buildServerConfigFromEnv() {
  const apiKey = process.env.FIREBASE_API_KEY;
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.FIREBASE_APP_ID;
  if (!apiKey || !projectId) return null;
  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

// Returns an authenticated Firebase Server App and current user for SSR
export async function getAuthenticatedAppForUser() {
  const authIdToken = (await cookies()).get("__session")?.value;

  // Reuse an existing initialized app if available on the server process
  let baseApp;
  if (getApps().length > 0) {
    baseApp = getApps()[0];
  } else {
    const cfg = buildServerConfigFromEnv();
    if (!cfg) {
      throw new Error(
        "Server-side Firebase initialization requires FIREBASE_* environment variables (FIREBASE_API_KEY, FIREBASE_PROJECT_ID, etc.)."
      );
    }
    baseApp = initializeApp(cfg);
  }

  const firebaseServerApp = initializeServerApp(baseApp, { authIdToken });

  const auth = getAuth(firebaseServerApp);
  await auth.authStateReady();

  return { firebaseServerApp, currentUser: auth.currentUser };
}
