// This file helps our server-side code talk to Firebase Functions
// It's like a helper that makes it easy to call our AI summary function

// Make sure this code only runs on the server, not in the browser
import "server-only";

/**
 * Ask the AI to summarize clinician reviews
 * This function sends review texts to our cloud function and gets back a summary
 * @param {string[]} reviewTexts - The actual review texts that people wrote
 * @returns {Promise<string>} - The AI-generated summary of what the reviews say
 */
export async function callGenerateReviewSummary(reviewTexts) {
  // Check if we have any reviews to work with
  if (!reviewTexts || reviewTexts.length === 0) {
    // If no reviews, tell the user there are no reviews
    return 'No reviews yet.';
  }

  // Go through all reviews and only keep ones that have text (remove empty ones)
  const validTexts = reviewTexts.filter(text => text && text.trim().length > 0);
  // Check if we have any valid reviews left
  if (validTexts.length === 0) {
    // If all reviews were empty, tell the user
    return 'No reviews yet.';
  }

  try {
    // Get the Firebase project ID from environment variables (or use a default)
    const projectId = process.env.TTC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'the-therapy-compass';
    
    // Build the web address (URL) for our AI function
    // For v2 callable functions, we need to use the proper format
    const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/generateReviewSummary`;
    
    // Write a message to the console saying we're calling the function
    console.log('Calling Firebase Function:', functionUrl, 'with', validTexts.length, 'reviews');
    console.log('Project ID:', projectId);
    console.log('Review texts sample:', validTexts.slice(0, 1));

    // Send the reviews to the AI function and wait for a response
    const response = await fetch(functionUrl, {
      // Use POST method to send data (like mailing a letter)
      method: 'POST',
      // Tell the server we're sending JSON data (structured text format)
      headers: {
        'Content-Type': 'application/json',
      },
      // Convert our reviews into JSON format and send them
      body: JSON.stringify({
        // Put the reviews inside a "data" object (required for callable functions)
        data: {
          reviewTexts: validTexts,
        },
      }),
    });

    // Check if the function said there was an error
    if (!response.ok) {
      // Get the error message from the response
      let errorText;
      try {
        errorText = await response.text();
      } catch {
        errorText = `HTTP ${response.status} ${response.statusText}`;
      }
      // Write an error message to the console with full details
      console.error('Firebase Function error:', {
        status: response.status,
        statusText: response.statusText,
        url: functionUrl,
        errorText: errorText,
      });
      // Throw an error so the calling code knows something went wrong
      throw new Error(`Firebase Function returned ${response.status}: ${errorText.substring(0, 200)}`);
    }

    // Convert the JSON response back into JavaScript data we can use
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse Firebase Function response:', parseError);
      throw new Error('Firebase Function returned invalid JSON response');
    }
    
    // Log the full response for debugging
    console.log('Firebase Function response:', JSON.stringify(result, null, 2));
    
    // Try to get the summary from the response (it might be in different places)
    // v2 callable functions return: { result: { summary: "..." } }
    const summary = result?.result?.summary || result?.summary || '';
    
    // Check if we got a summary
    if (!summary || summary.trim().length === 0) {
      // Log that we got an empty summary
      console.warn('Firebase Function returned empty summary. Full response:', result);
      // If no summary, tell the user how many reviews exist
      return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients.`;
    }

    // Return the summary, removing any extra spaces at the beginning or end
    return summary.trim();
  } catch (error) {
    // If something went wrong, write a detailed error message
    console.error('Error calling Firebase Function:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    // Tell the user what happened in a friendly way, but include more details
    const errorDetails = error.message || 'Unknown error';
    return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. Unable to generate AI summary: ${errorDetails}`;
  }
}
