/**
 * Firebase Functions with Genkit for AI-powered review summaries
 */

// Load Genkit configuration first
require("./genkit.config.js");

const {setGlobalOptions} = require("firebase-functions");
const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const {genkit} = require("genkit");
const {googleAI} = require("@genkit-ai/googleai");

// Define the secret for Gemini API key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Initialize Genkit with Google AI plugin
// Note: We'll initialize this inside the function to access the secret
let aiInstance = null;

/**
 * Initialize Genkit with Google AI plugin and get AI instance
 * @return {Object} The initialized Genkit AI instance
 */
function getAiInstance() {
  if (!aiInstance) {
    const apiKey = geminiApiKey.value();
    aiInstance = genkit({
      plugins: [googleAI({apiKey: apiKey})],
      logLevel: "info",
    });
  }
  return aiInstance;
}

// For cost control, set the maximum number of containers
setGlobalOptions({maxInstances: 10});

/**
 * Callable function to generate review summaries using Genkit
 * This function uses Gemini AI to summarize clinician reviews
 */
exports.generateReviewSummary = onCall(
    {
      cors: true,
      maxInstances: 5,
      secrets: [geminiApiKey],
    },
    async (request) => {
      const {reviewTexts} = request.data;

      logger.info("Generating review summary", {
        reviewCount: (reviewTexts && reviewTexts.length) || 0,
      });

      if (!reviewTexts || !Array.isArray(reviewTexts) ||
        reviewTexts.length === 0) {
        return {summary: "No reviews yet."};
      }

      // Filter out empty review texts
      const validTexts = reviewTexts.filter(
          (text) => text && text.trim().length > 0);
      if (validTexts.length === 0) {
        return {summary: "No reviews yet."};
      }

      // Build prompt for Gemini
      const prompt = `Based on the following clinician reviews, ` +
        `create a concise one-sentence summary (max 100 words) ` +
        `of what people think of this mental health clinician. ` +
        `Focus on common themes, strengths, and overall fit.\n\n` +
        `Reviews:\n${validTexts.join("\n---\n")}`;

      // Use Genkit to call Gemini model
      // Try gemini-1.5-flash first, fallback to gemini-pro if needed
      let response;
      let lastError = null;

      const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-pro",
      ];

      // Initialize Genkit (this configures the plugins)
      getAiInstance();

      for (const modelName of modelsToTry) {
        try {
          logger.info(`Trying Genkit model: ${modelName}`);

          // Use the googleAI plugin's model method
          // Extract just the model name (remove "googleai/" prefix if present)
          const cleanModelName = modelName.replace("googleai/", "");
          const model = googleAI.model(cleanModelName);

          response = await model.generate({
            prompt: prompt,
            config: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 200,
            },
          });

          // If successful, break out of the loop
          const hasText = response && (response.text ||
            (response.candidates && response.candidates[0] &&
             response.candidates[0].text));
          if (hasText) {
            logger.info(`Successfully used Genkit model: ${modelName}`);
            break;
          }
        } catch (error) {
          lastError = error;
          logger.warn(`Model ${modelName} failed:`, error.message);
          continue;
        }
      }

      // Extract the generated text
      if (!response) {
        logger.error("All Genkit models failed", lastError);
        const reviewCount = validTexts.length;
        const reviewText = reviewCount === 1 ? "review" : "reviews";
        return {
          summary: `Based on ${reviewCount} ${reviewText}, ` +
            `this clinician has received feedback from patients. ` +
            `Unable to generate AI summary at this time.`,
          error: (lastError && lastError.message) || "Unknown error",
        };
      }

      // Handle different response formats
      const candidateText = response.candidates && response.candidates[0] &&
        response.candidates[0].text;
      const candidateParts = response.candidates && response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts[0] &&
        response.candidates[0].content.parts[0].text;
      const summary = response.text || candidateText || candidateParts || "";

      if (!summary || summary.trim().length === 0) {
        const reviewCount = validTexts.length;
        const reviewText = reviewCount === 1 ? "review" : "reviews";
        return {
          summary: `Based on ${reviewCount} ${reviewText}, ` +
            `this clinician has received feedback from patients.`,
        };
      }

      logger.info("Review summary generated successfully");
      return {summary: summary.trim()};
    },
);
