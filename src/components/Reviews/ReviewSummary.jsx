// This component shows an AI-generated summary of all the reviews for a clinician
// It's like a smart assistant that reads all reviews and tells you what they say

// Import the helper function that gets reviews from our database
import { getReviewsByClinicianId } from "@/src/lib/firebase/therapyFirestore.js";
// Import the helper function that connects us to Firebase on the server
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp";
// Import the function that creates a Firestore database connection
import { getFirestore } from "firebase/firestore";
// Import the helper function that calls our AI summary function
import { callGenerateReviewSummary } from "@/src/lib/firebase/functions.js";

/**
 * This component generates and displays an AI summary of reviews
 * It runs on the server, so it can safely use API keys and secrets
 * @param {string} clinicianId - The ID of the clinician whose reviews we're summarizing
 */
export async function GeminiSummary({ clinicianId }) {
  try {
    // Try to connect to Firebase on the server side
    // Get the Firebase app and server app from the helper function
    const { firebaseServerApp } = await getAuthenticatedAppForUser();
    // Get all the reviews for this specific clinician from the database
    // Pass the database connection and the clinician ID to the helper function
    const reviews = await getReviewsByClinicianId(
      // Create a Firestore database connection from our server app
      getFirestore(firebaseServerApp),
      // Tell it which clinician's reviews we want by passing the ID
      clinicianId
    );

    // Write a message to the console showing what we found (helps with debugging)
    console.log('Fetched reviews for clinician:', {
      // Include the clinician ID in the log
      clinicianId,
      // Count how many reviews we got
      reviewsCount: reviews.length,
      // Show information about the first review if it exists
      sampleReview: reviews[0] ? {
        // Get the review's ID
        id: reviews[0].id,
        // Check if the review has text (it might be in 'text' or 'reviewText' field)
        hasText: !!(reviews[0].text || reviews[0].reviewText),
        // Get the actual text from the review
        text: reviews[0].text || reviews[0].reviewText || 'N/A',
        // Get a list of all the field names in the review
        fields: Object.keys(reviews[0])
      } : 'No reviews'
    });

    // Extract just the text from each review - we only need the words, not other info
    const reviewTexts = reviews
      // Go through each review and get its text (it might be in 'text' or 'reviewText' field)
      .map((review) => review.text || review.reviewText || '')
      // Remove any empty reviews - only keep reviews that have actual text after removing spaces
      .filter((text) => text.trim().length > 0);

    // Write another message showing how many reviews have text
    console.log('Review texts extracted:', {
      // Count the total number of reviews we started with
      totalReviews: reviews.length,
      // Count how many reviews have actual text
      reviewsWithText: reviewTexts.length,
      // Show the first 2 review texts as examples
      sampleTexts: reviewTexts.slice(0, 2)
    });

    // Check if we have any reviews with text
    if (reviewTexts.length === 0) {
      // If no reviews, return JSX that shows a message to the user
      return (
        <div className="clinician__review_summary">
          <p className="text-[#8A8E75] italic text-base">No reviews yet. Be the first to share your experience!</p>
        </div>
      );
    }

    // Write a message saying we're about to generate a summary
    console.log('Generating summary with Firebase Function (Genkit) for', reviewTexts.length, 'reviews');
    
    try {
      // Call our AI function to summarize all the review texts and wait for the answer
      const summary = await callGenerateReviewSummary(reviewTexts);
      
      // Return JSX that shows the summary to the user with a note that it was created by AI
      return (
        <div className="clinician__review_summary">
          <p className="text-[#68604D] text-base leading-relaxed">{summary}</p>
          <p className="text-sm text-[#8A8E75] mt-2 italic">✨ Summarized with Gemini via Genkit</p>
        </div>
      );
    } catch (functionError) {
      // If calling the AI function failed, write an error message to the console
      console.error('Firebase Function error:', functionError);
      // Return JSX that shows the user that reviews exist but we couldn't generate a summary
      return (
        <div className="clinician__review_summary">
          <p className="text-[#68604D] text-base">
            {reviewTexts.length} {reviewTexts.length === 1 ? 'review' : 'reviews'} available.
          </p>
          <p className="text-sm text-[#8A8E75] mt-2 italic">
            {functionError.message || 'Unable to generate AI summary at this time. Please ensure Firebase Functions are deployed.'}
          </p>
        </div>
      );
    }
  } catch (e) {
    // If something went really wrong, write error messages to the console
    console.error('Error generating review summary:', e);
    // Write the error stack trace (shows where the error happened)
    console.error('Error stack:', e.stack);
    // Write detailed information about the error
    console.error('Error details:', {
      // Get the error message
      message: e.message,
      // Get the error type name
      name: e.name,
      // Get the cause of the error if it exists
      cause: e.cause
    });
    
    // Create a variable to hold the error message we'll show to the user
    let errorMessage = 'Unable to generate summary at this time.';
    // Check if the error has a message
    if (e.message) {
      // Check if the error is about the API key
      if (e.message.includes('API key')) {
        // Set a specific message about the API key problem
        errorMessage = 'Gemini API key is missing or invalid. Please configure GEMINI_API_KEY environment variable.';
      } else if (e.message.includes('403') || e.message.includes('401')) {
        // Check if the error is about authentication (403 or 401 status codes)
        errorMessage = 'Gemini API authentication failed. Please check your API key.';
      } else if (e.message.includes('429')) {
        // Check if the error is about rate limiting (429 status code means too many requests)
        errorMessage = 'Gemini API rate limit exceeded. Please try again later.';
      } else if (e.message.includes('404')) {
        // Check if the error is about the model not being found (404 status code)
        errorMessage = 'Gemini API model not found. Please check the model name.';
      } else {
        // For any other error, show the actual error message
        errorMessage = `Error: ${e.message}`;
      }
    }
    
    // Return JSX that shows the error message to the user
      return (
        <div className="clinician__review_summary">
          <p className="text-[#8A8E75] italic text-base">{errorMessage}</p>
          <p className="text-xs text-[#8A8E75] mt-2">Check the browser console (F12) for more details.</p>
        </div>
      );
    }
  }

  /**
   * This shows a loading message while the AI is generating the summary
   * It's like a "please wait" sign while the AI reads all the reviews
   */
  export function GeminiSummarySkeleton() {
    // Return JSX that shows a message saying we're working on generating the summary
    return (
      <div className="clinician__review_summary">
        <p className="text-[#8A8E75] text-base">✨ Summarizing reviews with Gemini...</p>
      </div>
    );
  }
