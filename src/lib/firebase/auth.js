// Import Firebase auth helpers and providers
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged as _onAuthStateChanged,
  onIdTokenChanged as _onIdTokenChanged,
} from "firebase/auth";

// Import the initialized client auth instance
import { auth } from "./clientApp";

// Wrapper to subscribe to auth state changes
export function onAuthStateChanged(cb) {
  if (!auth) {
    console.error("Firebase Auth is not initialized");
    return () => {}; // Return no-op unsubscribe function
  }
  return _onAuthStateChanged(auth, cb);
}

// Wrapper to subscribe to ID token changes
export function onIdTokenChanged(cb) {
  if (!auth) {
    console.error("Firebase Auth is not initialized");
    return () => {}; // Return no-op unsubscribe function
  }
  return _onIdTokenChanged(auth, cb);
}

// Sign in using Google via a popup
export async function signInWithGoogle() {
  if (!auth) {
    const error = new Error("Firebase Auth is not initialized. Please refresh the page.");
    console.error(error);
    alert("Authentication error: Firebase Auth is not initialized. Please refresh the page.");
    throw error;
  }

  const provider = new GoogleAuthProvider();
  
  // Add additional scopes if needed
  provider.addScope('profile');
  provider.addScope('email');

  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Sign in successful:", result.user.email);
    return result;
  } catch (error) {
    console.error("Error signing in with Google", error);
    
    // Provide user-friendly error messages
    let errorMessage = "Failed to sign in. ";
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage += "Sign-in popup was closed.";
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage += "Popup was blocked by browser. Please allow popups for this site.";
    } else if (error.code === 'auth/unauthorized-domain') {
      errorMessage += "This domain is not authorized for Firebase Auth. Please check Firebase Console settings.";
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage += "Google sign-in is not enabled. Please enable it in Firebase Console.";
    } else {
      errorMessage += error.message || "Please try again.";
    }
    
    alert(errorMessage);
    throw error;
  }
}

// Sign the current user out
export async function signOut() {
  try {
    return auth.signOut();
  } catch (error) {
    console.error("Error signing out with Google", error);
  }
}