// import helper to fetch reviews from Firestore
import { getReviewsByClinicianId } from "@/src/lib/firebase/therapyFirestore.js";
// import server helper to get an authenticated Firebase app
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp";
// import getFirestore to create a Firestore instance from the app
import { getFirestore } from "firebase/firestore";
// import Genkit-based summarizer
import { generateReviewSummaryWithGenkit } from "@/src/lib/genkit/reviewSummarizer.js";

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

    console.log('Fetched reviews for clinician:', {
      clinicianId,
      reviewsCount: reviews.length,
      sampleReview: reviews[0] ? {
        id: reviews[0].id,
        hasText: !!(reviews[0].text || reviews[0].reviewText),
        text: reviews[0].text || reviews[0].reviewText || 'N/A',
        fields: Object.keys(reviews[0])
      } : 'No reviews'
    });

    // Filter out reviews with no text and get review texts
    const reviewTexts = reviews
      .map((review) => review.text || review.reviewText || '')
      .filter((text) => text.trim().length > 0);

    console.log('Review texts extracted:', {
      totalReviews: reviews.length,
      reviewsWithText: reviewTexts.length,
      sampleTexts: reviewTexts.slice(0, 2)
    });

    // If no reviews with text, return a message
    if (reviewTexts.length === 0) {
      return (
        <div className="clinician__review_summary">
          <p className="text-[#8A8E75] italic">No reviews yet. Be the first to share your experience!</p>
        </div>
      );
    }

    // Use Genkit to generate summary
    console.log('Generating summary with Genkit for', reviewTexts.length, 'reviews');
    
    try {
      const summary = await generateReviewSummaryWithGenkit(reviewTexts);
      
      // return JSX that shows the summary text and a note about Gemini
      return (
        <div className="clinician__review_summary">
          <p className="text-[#68604D]">{summary}</p>
          <p className="text-sm text-[#8A8E75] mt-2">✨ Summarized with Gemini via Genkit</p>
        </div>
      );
    } catch (genkitError) {
      console.error('Genkit summary generation failed:', genkitError);
      // Fallback to show reviews available
      return (
        <div className="clinician__review_summary">
          <p className="text-[#68604D]">
            {reviewTexts.length} {reviewTexts.length === 1 ? 'review' : 'reviews'} available.
          </p>
          <p className="text-sm text-[#8A8E75] mt-2 italic">
            {genkitError.message || 'Unable to generate AI summary at this time.'}
          </p>
        </div>
      );
    }
  } catch (e) {
    // log errors and render an error message
    console.error('Error generating review summary:', e);
    console.error('Error stack:', e.stack);
    console.error('Error details:', {
      message: e.message,
      name: e.name,
      cause: e.cause
    });
    
    // Provide more helpful error messages
    let errorMessage = 'Unable to generate summary at this time.';
    if (e.message) {
      if (e.message.includes('API key')) {
        errorMessage = 'Gemini API key is missing or invalid. Please configure GEMINI_API_KEY environment variable.';
      } else if (e.message.includes('403') || e.message.includes('401')) {
        errorMessage = 'Gemini API authentication failed. Please check your API key.';
      } else if (e.message.includes('429')) {
        errorMessage = 'Gemini API rate limit exceeded. Please try again later.';
      } else if (e.message.includes('404')) {
        errorMessage = 'Gemini API model not found. Please check the model name.';
      } else {
        errorMessage = `Error: ${e.message}`;
      }
    }
    
    return (
      <div className="clinician__review_summary">
        <p className="text-[#8A8E75] italic">{errorMessage}</p>
        <p className="text-xs text-[#8A8E75] mt-2">Check the browser console (F12) for more details.</p>
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

