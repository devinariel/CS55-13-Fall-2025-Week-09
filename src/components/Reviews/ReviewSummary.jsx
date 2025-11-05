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
    
    // Debug logging (without exposing the actual key)
    console.log('Gemini API Key check:', {
      hasKey: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
      keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none'
    });
    
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      // Fallback to a simple summary if Gemini is not configured
      return (
        <div className="clinician__review_summary">
          <p className="text-[#68604D]">
            {reviewTexts.length} {reviewTexts.length === 1 ? 'review' : 'reviews'} available. 
          </p>
          <p className="text-sm text-[#8A8E75] mt-2 italic">
            AI-powered summaries are currently unavailable. Please read individual reviews below for detailed feedback.
          </p>
        </div>
      );
    }

    // Build a prompt for the summary
    const prompt = `Based on the following clinician reviews, create a concise one-sentence summary (max 100 words) of what people think of this mental health clinician. Focus on common themes, strengths, and overall fit.\n\nReviews:\n${reviewTexts.join('\n---\n')}`;

    // Call Gemini API directly
    // Try gemini-1.5-flash first, fallback to gemini-1.5-pro if needed
    let model = 'gemini-1.5-flash';
    let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    console.log('Calling Gemini API:', {
      model: model,
      reviewTextsCount: reviewTexts.length,
      promptLength: prompt.length,
      hasApiKey: !!apiKey
    });
    
    let response;
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
      
      console.log('Gemini API response status:', response.status, response.statusText);
      
      // If model not found, try alternative
      if (response.status === 404) {
        console.log('Model not found, trying gemini-1.5-pro...');
        model = 'gemini-1.5-pro';
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
        console.log('Fallback model response status:', response.status, response.statusText);
      }
    } catch (fetchError) {
      console.error('Fetch error details:', {
        message: fetchError.message,
        stack: fetchError.stack,
        name: fetchError.name
      });
      throw new Error(`Failed to connect to Gemini API: ${fetchError.message}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        model: model
      });
      
      // Provide more specific error messages
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed (${response.status}). Please verify your Gemini API key is correct and has proper permissions.`);
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        throw new Error(`Bad request (${response.status}). ${errorText.substring(0, 100)}`);
      } else {
        throw new Error(`Gemini API returned ${response.status}: ${errorText.substring(0, 200)}`);
      }
    }

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
