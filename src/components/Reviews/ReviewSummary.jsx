// import the Gemini model and Google AI plugin from genkit
import { gemini20Flash, googleAI } from "@genkit-ai/googleai";
// import the genkit helper to create an AI client
import { genkit } from "genkit";
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

    // use this character to separate reviews in the prompt
    const reviewSeparator = "@";
    // build a prompt that lists all review texts separated by reviewSeparator
    const prompt = `
  Based on the following clinician reviews, 
  where each review is separated by a '${reviewSeparator}' character, 
  create a concise one-sentence summary (max 100 words) of what people think of this mental health clinician. 
  Focus on common themes, strengths, and overall fit. 

  Here are the reviews: ${reviewTexts.join(reviewSeparator)}
  `;

    // ensure the Gemini API key is available in environment
    if (!process.env.GEMINI_API_KEY) {
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

    // create a genkit AI client with the Google AI plugin and default model
    const ai = genkit({
      plugins: [googleAI()],
      model: gemini20Flash, // set default model
    });
    // generate text from the prompt
    const { text } = await ai.generate(prompt);

    // return JSX that shows the summary text and a note about Gemini
    return (
      <div className="clinician__review_summary">
        <p className="text-[#68604D]">{text}</p>
        <p className="text-sm text-[#8A8E75] mt-2">✨ Summarized with Gemini</p>
      </div>
    );
  } catch (e) {
    // log errors and render an error message
    console.error('Error generating review summary:', e);
    return (
      <div className="clinician__review_summary">
        <p className="text-[#8A8E75] italic">
          Unable to generate summary at this time. Please try again later.
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
