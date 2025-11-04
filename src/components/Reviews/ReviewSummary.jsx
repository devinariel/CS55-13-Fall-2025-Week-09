// import helper to fetch reviews from Firestore
import { getReviewsByClinicianId } from "@/src/lib/firebase/therapyFirestore.js";
// import server helper to get an authenticated Firebase app
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp";
// import getFirestore to create a Firestore instance from the app
import { getFirestore } from "firebase/firestore";

// server component: generate a one-sentence summary using Gemini
export async function GeminiSummary({ clinicianId }) {
  try {
    // get an authenticated Firebase server app for the current user
    const { firebaseServerApp } = await getAuthenticatedAppForUser();
    // fetch reviews for the clinician from Firestore
    const reviews = await getReviewsByClinicianId(
      // create a Firestore instance from the server app
      getFirestore(firebaseServerApp),
      // pass the clinician ID to fetch its reviews
      clinicianId
    );

    // Filter out reviews with no text and get review texts
    const reviewTexts = reviews
      .map((review) => review.text || review.reviewText || '')
      .filter((text) => text.trim().length > 0);

    // If no reviews with text, return a message
    if (reviewTexts.length === 0) {
      return (
        <div className="clinician__review_summary">
          <p className="text-[#8A8E75] italic">No reviews yet. Be the first to share your experience!</p>
        </div>
      );
    }

    // ensure the Gemini API key is available in environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback to a simple summary if Gemini is not configured
      return (
        <div className="clinician__review_summary">
          <p className="text-[#68604D]">
            {reviewTexts.length} {reviewTexts.length === 1 ? 'review' : 'reviews'} available. 
            Gemini API key not configured for AI summaries.
          </p>
        </div>
      );
    }

    // Build a prompt for the summary
    const prompt = `Based on the following clinician reviews, create a concise one-sentence summary (max 100 words) of what people think of this mental health clinician. Focus on common themes, strengths, and overall fit.\n\nReviews:\n${reviewTexts.join('\n---\n')}`;

    // Call Gemini API directly
    // Try gemini-2.0-flash-exp first, fallback to gemini-1.5-flash if not available
    let response;
    let model = 'gemini-2.0-flash-exp';
    
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 200,
            }
          }),
        }
      );
      
      // If model not found, try fallback
      if (!response.ok && response.status === 404) {
        model = 'gemini-1.5-flash';
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 200,
              }
            }),
          }
        );
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      throw new Error(`Failed to connect to Gemini API: ${fetchError.message}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Extract the generated text from the response
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                 data?.response?.text || 
                 'Unable to generate summary.';

    // return JSX that shows the summary text and a note about Gemini
    return (
      <div className="clinician__review_summary">
        <p className="text-[#68604D]">{text.trim()}</p>
        <p className="text-sm text-[#8A8E75] mt-2">✨ Summarized with Gemini</p>
      </div>
    );
  } catch (e) {
    // log errors and render an error message
    console.error('Error generating review summary:', e);
    return (
      <div className="clinician__review_summary">
        <p className="text-[#8A8E75] italic">
          Unable to generate summary at this time. {e.message ? `Error: ${e.message}` : 'Please try again later.'}
        </p>
      </div>
    );
  }
}

// simple skeleton shown while the summary is being generated
export function GeminiSummarySkeleton() {
  // render placeholder copy while waiting for Gemini
  return (
    <div className="clinician__review_summary">
      <p className="text-[#8A8E75]">✨ Summarizing reviews with Gemini...</p>
    </div>
  );
}
