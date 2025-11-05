// Genkit configuration for Firebase Functions
// This file is loaded at the start of index.js to initialize Genkit
const {configureGenkit} = require("genkit");
const {googleAI} = require("@genkit-ai/googleai");
const {enableFirebaseTelemetry} = require("@genkit-ai/firebase");

// Get API key from environment (Firebase Functions automatically provides this)
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY not found in environment variables");
}

// Configure Genkit with Google AI (Gemini) and Firebase telemetry
configureGenkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
  logLevel: "info",
  enableTelemetry: enableFirebaseTelemetry(),
});

console.log("Genkit configured successfully");

