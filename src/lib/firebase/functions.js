// Helper to call Firebase Functions from server components
import "server-only";

/**
 * Call the generateReviewSummary Firebase Function
 * @param {string[]} reviewTexts - Array of review text strings
 * @returns {Promise<string>} - Generated summary text
 */
export async function callGenerateReviewSummary(reviewTexts) {
  if (!reviewTexts || reviewTexts.length === 0) {
    return 'No reviews yet.';
  }

  // Filter out empty review texts
  const validTexts = reviewTexts.filter(text => text && text.trim().length > 0);
  if (validTexts.length === 0) {
    return 'No reviews yet.';
  }

  try {
    // Get the Firebase project ID from environment
    const projectId = process.env.TTC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'the-therapy-compass';
    
    // Build the Firebase Function URL
    // For v2 callable functions, the URL format is:
    // https://{region}-{projectId}.cloudfunctions.net/{functionName}
    // The default region for v2 functions is us-central1
    const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/generateReviewSummary`;
    
    console.log('Calling Firebase Function:', functionUrl, 'with', validTexts.length, 'reviews');

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          reviewTexts: validTexts,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firebase Function error:', response.status, errorText);
      throw new Error(`Firebase Function returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    // Firebase Functions v2 callable functions return data in result.result
    const summary = result?.result?.summary || result?.summary || '';
    
    if (!summary || summary.trim().length === 0) {
      return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients.`;
    }

    return summary.trim();
  } catch (error) {
    console.error('Error calling Firebase Function:', error);
    return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. Unable to generate AI summary: ${error.message}`;
  }
}

