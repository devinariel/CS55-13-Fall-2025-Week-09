// This file helps our app get AI summaries of reviews
// It can work from both the browser and the server, automatically choosing the right method

/**
 * Get an AI summary of multiple reviews
 * This is like asking a smart assistant to read all reviews and tell you what they say
 * @param {string[]} reviewTexts - The review texts to summarize
 * @returns {Promise<string>} - The AI-generated summary
 */
export async function generateReviewSummary(reviewTexts) {
  // Check if we have any reviews to summarize
  if (!reviewTexts || reviewTexts.length === 0) return 'No reviews yet.';

  // Go through all reviews and only keep ones with actual text
  const validTexts = reviewTexts.filter(text => text && text.trim().length > 0);
  // Check if we have any valid reviews left
  if (validTexts.length === 0) return 'No reviews yet.';

  // Check if we're running in the browser (window exists) or on the server
  if (typeof window !== 'undefined') {
    // We're in the browser, so use Firebase Functions SDK
    try {
      // Load the Firebase Functions tools we need
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      // Get our Firebase app connection
      const { firebaseApp } = await import('../firebase/clientApp');
      
      // Connect to Firebase Functions
      const functions = getFunctions(firebaseApp);
      // Get a reference to our specific AI summary function
      const generateReviewSummary = httpsCallable(functions, 'generateReviewSummary');
      
      // Write a message saying we're calling the function
      console.log('Calling Firebase Function: generateReviewSummary with', validTexts.length, 'reviews');
      
      // Call the function and wait for the AI to generate a summary
      const result = await generateReviewSummary({
        reviewTexts: validTexts,
      });

      // Get the summary text from the response
      const summary = result?.data?.summary || '';
      
      // Check if we got a summary
      if (!summary || summary.trim().length === 0) {
        // If no summary, tell the user how many reviews exist
        return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients.`;
      }

      // Return the summary, removing extra spaces
      return summary.trim();
    } catch (error) {
      // If something went wrong, write an error message
      console.error('Error calling Firebase Function:', error);
      // Tell the user what happened
      return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. Unable to generate AI summary: ${error.message || 'Unknown error'}`;
    }
  }

  // We're on the server, so we can call the Gemini API directly
  // Get the API key from environment variables (or use a backup one)
  const apiKey = process.env.GEMINI_API_KEY || process.env.TTC_GEMINI_API_KEY;
  
  // Check if we have an API key
  if (!apiKey) {
    // If no API key, tell the user it's not configured
    return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. Gemini API key not configured for AI summaries.`;
  }

  // Create the question/instruction we'll send to the AI
  const userQuery = `Analyze the following user reviews for a mental health clinician and provide a single, concise paragraph (max 100 words) summarizing the common themes regarding their style, strengths, and areas mentioned for improvement. Focus on 'fit' and approach, not simple scores. Reviews:\n\n${validTexts.join('\n---\n')}`;

  // Choose which AI model to use (gemini-1.5-flash is fast)
  const model = 'gemini-1.5-flash';
  // Build the web address for Google's Gemini API
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Set the maximum number of times we'll try if something goes wrong
  const MAX_RETRIES = 3;
  // Keep track of how many times we've tried
  let attempt = 0;
  
  // Keep trying until we succeed or run out of attempts
  while (attempt < MAX_RETRIES) {
    try {
      // Send the reviews to Google's Gemini AI and wait for a response
      const resp = await fetch(apiUrl, {
        // Use POST method to send data
        method: 'POST',
        // Tell Google we're sending JSON data
        headers: { 'Content-Type': 'application/json' },
        // Convert our question and reviews into JSON format
        body: JSON.stringify({
          // Put everything in a "contents" array
          contents: [{
            // Put the text in a "parts" array
            parts: [{
              text: userQuery
            }]
          }],
          // Tell the AI how to generate the response
          generationConfig: {
            // How creative the AI should be (0.7 = pretty creative)
            temperature: 0.7,
            // Limit how many word choices it considers (40 options)
            topK: 40,
            // Control how focused the response is (0.95 = very focused)
            topP: 0.95,
            // Maximum number of words in the summary (200 tokens)
            maxOutputTokens: 200,
          }
        }),
      });

      // Check if Google's API said there was an error
      if (!resp.ok) {
        // Get the error message
        const errorText = await resp.text();
        // Write an error message to the console
        console.error('Gemini API error:', resp.status, errorText);
        // Throw an error to trigger a retry
        throw new Error(`Gemini API returned ${resp.status}`);
      }

      // Convert the JSON response back into JavaScript data
      const data = await resp.json();
      
      // Create a variable to hold the summary text
      let text = '';
      // Check if the response has the summary in the expected format
      if (data?.candidates && data.candidates.length > 0) {
        // Get the first (and usually only) response
        const candidate = data.candidates[0];
        // Try to get the text from the response
        if (candidate?.content?.parts && candidate.content.parts.length > 0) {
          // Get the text from the first part
          text = candidate.content.parts[0].text || '';
        }
      }
      
      // Check if we got a summary
      if (text && text.trim().length > 0) {
        // If yes, return it (removing extra spaces)
        return text.trim();
      }
      
      // If we didn't get text, something went wrong
      throw new Error('Empty response from Gemini API');
    } catch (e) {
      // Count this attempt
      attempt++;
      // Write a message about what went wrong
      console.error(`Attempt ${attempt} failed:`, e);
      // Check if we should try again
      if (attempt < MAX_RETRIES) {
        // Wait a bit before trying again (wait longer each time)
        await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
      } else {
        // If we've tried 3 times and still failed, give up
        return 'Summary generation failed. Please try again later.';
      }
    }
  }
  
  // If we somehow got here without returning, tell the user it failed
  return 'Summary generation failed.';
}
