// Genkit configuration for Firebase Functions
// This file is loaded at the start of index.js to initialize Genkit
// Note: Genkit is initialized automatically when functions are deployed
// We just need to ensure the API key is available
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY not found in environment variables");
}

console.log("Genkit configuration loaded. API key available:", !!apiKey);

