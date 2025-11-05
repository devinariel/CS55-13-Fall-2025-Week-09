/**
 * Firebase Functions with Genkit for AI-powered review summaries
 * This file handles generating AI summaries of clinician reviews using Google's Gemini AI
 */

// Load the configuration file that sets up Genkit
require("./genkit.config.js");

// Get the function that lets us set global options for all functions
const {setGlobalOptions} = require("firebase-functions");
// Get the function that lets us create callable functions
const {onCall} = require("firebase-functions/v2/https");
// Get the function that lets us use secrets (like passwords) safely
const {defineSecret} = require("firebase-functions/params");
// Get the logger so we can write messages about what's happening
const logger = require("firebase-functions/logger");
// Get Genkit, which is Google's tool for using AI
const {genkit} = require("genkit");
// Get the Google AI plugin, which connects Genkit to Google's Gemini AI
const {googleAI} = require("@genkit-ai/googleai");

// Create a secret that holds our API key (password for Google's AI)
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Create a variable to remember if we've set up Genkit yet
let aiInstance = null;

/**
 * Set up Genkit with Google AI so we can use Gemini models
 * This is like turning on the AI engine and connecting it to Google's servers
 * @return {Object} The configured Genkit AI instance
 */
function getAiInstance() {
  // Check if we've already set up Genkit
  if (!aiInstance) {
    // Get our API key from the secret storage
    const apiKey = geminiApiKey.value();
    // Check if we have an API key
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY secret is not available");
    }
    // Set up Genkit with the Google AI plugin and our API key
    aiInstance = genkit({
      // Tell Genkit to use the Google AI plugin with our API key
      plugins: [googleAI({apiKey: apiKey})],
      // Set how much information to log (info level shows important messages)
      logLevel: "info",
      // Enable Firebase telemetry for better monitoring
      enableFirebaseTelemetry: true,
    });
  }
  // Give back the Genkit AI instance so we can use it
  return aiInstance;
}

// Set a limit on how many copies of functions can run at the same time (helps control costs)
setGlobalOptions({maxInstances: 10});

/**
 * This function takes review texts and asks AI to summarize them
 * It's like asking a smart assistant to read all the reviews and tell you what they say
 * People can call this from the web app to get AI summaries
 */
exports.generateReviewSummary = onCall(
    {
      // Allow websites to call this function from different places
      cors: true,
      // Only allow 5 copies of this function to run at the same time
      maxInstances: 5,
      // Make sure we have access to the API key secret
      secrets: [geminiApiKey],
    },
    async (request) => {
      // Get the review texts from the request that was sent to us
      const {reviewTexts} = request.data;

      // Write a message saying we're starting to generate a summary
      logger.info("Generating review summary", {
        // Count how many reviews we got (or 0 if there aren't any)
        reviewCount: (reviewTexts && reviewTexts.length) || 0,
      });

      // Check if we got any reviews at all
      if (!reviewTexts || !Array.isArray(reviewTexts) ||
        reviewTexts.length === 0) {
        // If no reviews, send back a message saying there are no reviews
        return {summary: "No reviews yet."};
      }

      // Go through all reviews and only keep the ones that have actual text
      const validTexts = reviewTexts.filter(
          // For each review text, check if it exists and has text after removing spaces
          (text) => text && text.trim().length > 0);
      // Check if we have any valid reviews left after filtering
      if (validTexts.length === 0) {
        // If all reviews were empty, send back a message
        return {summary: "No reviews yet."};
      }

      // Build the question/instruction we'll send to the AI
      const prompt = `Based on the following clinician reviews, ` +
        `create a concise one-sentence summary (max 100 words) ` +
        `of what people think of this mental health clinician. ` +
        `Focus on common themes, strengths, and overall fit.\n\n` +
        `Reviews:\n${validTexts.join("\n---\n")}`;

      // Create a variable to hold the AI's response (we'll fill it in later)
      let response;
      // Create a variable to remember the last error we got (if any)
      let lastError = null;

      // Make a list of AI models to try, starting with the fastest one
      const modelsToTry = [
        // First try the fast model
        "gemini-1.5-flash",
        // If that doesn't work, try the more powerful model
        "gemini-pro",
      ];

      // Set up Genkit so we can use it (this connects to Google's AI)
      const ai = getAiInstance();

      // Try each model in the list until one works
      for (const modelName of modelsToTry) {
        try {
          // Write a message saying which model we're trying
          logger.info(`Trying Genkit model: ${modelName}`);

          // Remove the "googleai/" part from the model name if it's there
          const cleanModelName = modelName.replace("googleai/", "");
          // Build the full model name with the plugin prefix
          const fullModelName = `googleai/${cleanModelName}`;

          // Ask the AI to generate a summary and wait for the answer
          // Use the ai.generate method with the model name
          response = await ai.generate({
            // Tell it which model to use
            model: fullModelName,
            // Send the question/instruction we built earlier
            prompt: prompt,
            // Tell the AI how to behave
            config: {
              // How creative the AI should be (0.7 means pretty creative)
              temperature: 0.7,
              // Limit how many word choices it considers (40 options)
              topK: 40,
              // Control how focused the response is (0.95 means very focused)
              topP: 0.95,
              // Maximum number of words in the summary (200 tokens)
              maxOutputTokens: 200,
            },
          });

          // Check if the response has text we can use
          // Genkit returns the text directly in response.text
          const hasText = response && (
            response.text ||
            // Or check if the text is in a different place in the response
            (response.candidates && response.candidates[0] &&
             response.candidates[0].text) ||
            // Or check the content parts
            (response.candidates && response.candidates[0] &&
             response.candidates[0].content &&
             response.candidates[0].content.parts &&
             response.candidates[0].content.parts[0] &&
             response.candidates[0].content.parts[0].text)
          );
          // If we got text, we're done!
          if (hasText) {
            // Write a message saying which model worked
            logger.info(`Successfully used Genkit model: ${modelName}`);
            // Stop trying other models
            break;
          }
        } catch (error) {
          // If this model failed, save the error
          lastError = error;
          // Write a warning message about what went wrong
          logger.warn(`Model ${modelName} failed:`, error.message);
          // Try the next model in the list
          continue;
        }
      }

      // Check if none of the models worked
      if (!response) {
        // Write an error message saying all models failed
        logger.error("All Genkit models failed", lastError);
        // Count how many reviews we had
        const reviewCount = validTexts.length;
        // Use the right word (review vs reviews) based on the count
        const reviewText = reviewCount === 1 ? "review" : "reviews";
        // Send back a message explaining what happened
        return {
          // Build a message telling the user about the reviews
          summary: `Based on ${reviewCount} ${reviewText}, ` +
            `this clinician has received feedback from patients. ` +
            `Unable to generate AI summary at this time.`,
          // Include the error message if we have one
          error: (lastError && lastError.message) || "Unknown error",
        };
      }

      // Try to get the text from the first possible location in the response
      const candidateText = response.candidates && response.candidates[0] &&
          response.candidates[0].text;
      // Try to get the text from a second possible location in the response
      const candidateParts = response.candidates && response.candidates[0] &&
          response.candidates[0].content &&
          response.candidates[0].content.parts &&
          response.candidates[0].content.parts[0] &&
          response.candidates[0].content.parts[0].text;
      // Get the summary text, checking all possible locations
      const summary = response.text || candidateText || candidateParts || "";

      // Check if we couldn't find any text in the response
      if (!summary || summary.trim().length === 0) {
        // Count the reviews again
        const reviewCount = validTexts.length;
        // Use the right word again
        const reviewText = reviewCount === 1 ? "review" : "reviews";
        // Send back a default message
        return {
          summary: `Based on ${reviewCount} ${reviewText}, ` +
            `this clinician has received feedback from patients.`,
        };
      }

      // Write a message saying everything worked
      logger.info("Review summary generated successfully");
      // Send back the summary, removing any extra spaces at the beginning or end
      return {summary: summary.trim()};
    },
);
