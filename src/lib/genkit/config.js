// Genkit configuration for Next.js App Router
import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Get API key from environment
const apiKey = process.env.GEMINI_API_KEY || process.env.TTC_GEMINI_API_KEY;

// Initialize Genkit with Google AI (Gemini)
// This uses the GEMINI_API_KEY from environment variables
export const genkit = configureGenkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
  logLevel: 'info',
  enableTelemetry: false, // Disable telemetry for simplicity in App Hosting
});

// Export API key status for debugging
export const hasApiKey = !!apiKey;

