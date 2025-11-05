// This component sets up console filtering when the app loads
// It hides annoying browser extension errors so we can see real errors

"use client";

import { useEffect } from 'react';

export default function ConsoleFilter() {
  useEffect(() => {
    // Only run this in the browser
    if (typeof window === 'undefined') return;

    // Save the original console.error function
    const originalError = console.error;

    // Replace console.error with our filtered version
    console.error = function(...args) {
      // Convert all arguments to a string so we can check them
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }).join(' ');

      // List of error messages we want to ignore (from browser extensions)
      const ignoredErrors = [
        'Failed to initialize offscreen',
        'CONTENT SCRIPT',
        'offscreen',
        'Extension context invalidated',
        'chrome-extension://',
        'moz-extension://',
        'edge-extension://',
      ];

      // Check if this error is from a browser extension
      const isExtensionError = ignoredErrors.some(ignored => 
        message.includes(ignored)
      );

      // Only log the error if it's NOT from a browser extension
      if (!isExtensionError) {
        originalError.apply(console, args);
      }
      // Otherwise, silently ignore it
    };

    // Cleanup function (restore original console.error when component unmounts)
    return () => {
      console.error = originalError;
    };
  }, []); // Empty dependency array means this runs once when component mounts

  // This component doesn't render anything
  return null;
}

