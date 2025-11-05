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

    // ensure the Gemini API key is available in environment
    // Check multiple possible environment variable names for compatibility
    const apiKey = process.env.GEMINI_API_KEY || process.env.TTC_GEMINI_API_KEY;
    
    // Debug logging (without exposing the actual key)
    console.log('Gemini API Key check:', {
      hasKey: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
      keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
      hasGEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      hasTTC_GEMINI_API_KEY: !!process.env.TTC_GEMINI_API_KEY,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('GEMINI') || key.includes('API'))
    });
    
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      console.warn('Available env vars with GEMINI or API:', Object.keys(process.env).filter(key => key.includes('GEMINI') || key.includes('API')).join(', '));
      // Fallback to a simple summary if Gemini is not configured
      return (
        <div className="clinician__review_summary">
          <p className="text-[#68604D]">
            {reviewTexts.length} {reviewTexts.length === 1 ? 'review' : 'reviews'} available. 
          </p>
          <p className="text-sm text-[#8A8E75] mt-2 italic">
            AI-powered summaries are currently unavailable. The GEMINI_API_KEY environment variable is not configured. Please check Firebase App Hosting secrets configuration.
          </p>
        </div>
      );
    }

    // Build a prompt for the summary
    const prompt = `Based on the following clinician reviews, create a concise one-sentence summary (max 100 words) of what people think of this mental health clinician. Focus on common themes, strengths, and overall fit.\n\nReviews:\n${reviewTexts.join('\n---\n')}`;

    // Try different models in order - using v1beta API
    // gemini-1.5-flash is the most reliable and widely available model
    const modelConfigs = [
      { model: 'gemini-1.5-flash', version: 'v1beta' },
      { model: 'gemini-1.5-flash-latest', version: 'v1beta' },
      { model: 'gemini-1.5-pro', version: 'v1beta' },
    ];

    let response;
    let lastError = null;
    let successfulModel = null;

    for (const config of modelConfigs) {
      const apiUrl = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${apiKey}`;

      console.log('Trying Gemini API:', {
        model: config.model,
        version: config.version,
        reviewTextsCount: reviewTexts.length,
      });

      try {
        response = await fetch(apiUrl, {
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
        });

        console.log('Gemini API response status:', response.status, response.statusText, `(${config.model}/${config.version})`);

        // If successful, break out of the loop
        if (response.ok) {
          successfulModel = `${config.model} (${config.version})`;
          break;
        }

        // If 404, try next model
        if (response.status === 404) {
          const errorText = await response.text();
          lastError = { status: 404, message: errorText, model: config.model, version: config.version };
          console.log(`Model ${config.model} not found in ${config.version}, trying next...`);
          continue;
        }

        // For other errors, save and try next
        const errorText = await response.text();
        lastError = { status: response.status, message: errorText, model: config.model, version: config.version };
        console.log(`Model ${config.model} returned ${response.status}, trying next...`);
      } catch (fetchError) {
        lastError = { error: fetchError.message, model: config.model, version: config.version };
        console.error(`Error with ${config.model}/${config.version}:`, fetchError.message);
        continue;
      }
    }

    // Check if we got a successful response
    if (!response || !response.ok) {
      console.error('All Gemini API models failed. Last error:', lastError);
      throw new Error(`Gemini API models not available. Last attempt: ${lastError?.status || 'unknown'} - ${lastError?.message?.substring(0, 200) || lastError?.error || 'Unknown error'}`);
    }

    console.log(`Successfully used model: ${successfulModel}`);

    const data = await response.json();
    console.log('Gemini API response:', JSON.stringify(data, null, 2));
    
    // Extract the generated text from the response
    // Gemini API response structure: data.candidates[0].content.parts[0].text
    let text = '';
    if (data?.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate?.content?.parts && candidate.content.parts.length > 0) {
        text = candidate.content.parts[0].text || '';
      }
    }
    
    // Fallback parsing if structure is different
    if (!text && data?.response?.text) {
      text = data.response.text;
    }
    
    if (!text || text.trim().length === 0) {
      console.error('No text extracted from Gemini response:', data);
      throw new Error('Gemini API returned empty response');
    }

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

