// This file helps filter out annoying browser extension errors from the console
// Browser extensions often create errors that aren't related to our app

/**
 * Set up console filtering to hide browser extension errors
 * This makes it easier to see actual errors from our app
 */
export function setupConsoleFilter() {
  // Only run this in the browser (not on the server)
  if (typeof window === 'undefined') return;

  // Save the original console.error function
  const originalError = console.error;

  // Replace console.error with our filtered version
  console.error = function(...args) {
    // Convert all arguments to a string so we can check them
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      return JSON.stringify(arg);
    }).join(' ');

    // List of error messages we want to ignore (from browser extensions)
    const ignoredErrors = [
      'Failed to initialize offscreen',
      'CONTENT SCRIPT',
      'offscreen',
      'Extension context invalidated',
      'chrome-extension://',
      'moz-extension://',
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
}

// Automatically set up the filter when this file is imported
if (typeof window !== 'undefined') {
  setupConsoleFilter();
}

