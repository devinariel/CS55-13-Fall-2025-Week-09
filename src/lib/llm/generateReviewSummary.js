// Helper to call Gemini API to generate thematic summary
// This function can be called from client or server components
// Client components will call the API route, server components can use this directly
export async function generateReviewSummary(reviewTexts) {
  if (!reviewTexts || reviewTexts.length === 0) return 'No reviews yet.';

  // Filter out empty review texts
  const validTexts = reviewTexts.filter(text => text && text.trim().length > 0);
  if (validTexts.length === 0) return 'No reviews yet.';

  // If running on client-side, call the API route
  if (typeof window !== 'undefined') {
    try {
      const apiUrl = '/api/generate-summary';
      console.log('Calling API route:', apiUrl, 'with', validTexts.length, 'reviews');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewTexts: validTexts }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        console.error('API route error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          fullResponse: errorText
        });
        
        if (response.status === 404) {
          return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. AI summary service is not available. Please check server configuration.`;
        }
        
        // Extract error message from response
        let errorMessage = 'Unable to generate AI summary at this time.';
        if (errorData?.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error) {
            // Try to extract any error message
            errorMessage = JSON.stringify(errorData.error).substring(0, 200);
          }
        } else if (errorData) {
          // If error is not nested, try to get it directly
          errorMessage = JSON.stringify(errorData).substring(0, 200);
        }
        
        // Log full error for debugging
        console.error('Full API error response:', {
          status: response.status,
          errorData: errorData,
          fullResponse: errorText
        });
        
        return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. ${errorMessage}`;
      }

      const data = await response.json();
      return data.summary || 'No summary generated.';
    } catch (error) {
      console.error('Error calling generate-summary API:', error);
      if (error.message && error.message.includes('404')) {
        return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. AI summary API endpoint not found. The application may need to be redeployed.`;
      }
      return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. Unable to generate AI summary: ${error.message}`;
    }
  }

  // Server-side: Check for API key
  const apiKey = process.env.GEMINI_API_KEY || process.env.TTC_GEMINI_API_KEY;
  
  if (!apiKey) {
    // Return a fallback summary if API key is not available
    return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. Gemini API key not configured for AI summaries.`;
  }

  const userQuery = `Analyze the following user reviews for a mental health clinician and provide a single, concise paragraph (max 100 words) summarizing the common themes regarding their style, strengths, and areas mentioned for improvement. Focus on 'fit' and approach, not simple scores. Reviews:\n\n${validTexts.join('\n---\n')}`;

  const model = 'gemini-1.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: userQuery
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

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Gemini API error:', resp.status, errorText);
        throw new Error(`Gemini API returned ${resp.status}`);
      }

      const data = await resp.json();
      
      // Extract text from Gemini API response
      let text = '';
      if (data?.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate?.content?.parts && candidate.content.parts.length > 0) {
          text = candidate.content.parts[0].text || '';
        }
      }
      
      if (text && text.trim().length > 0) {
        return text.trim();
      }
      
      throw new Error('Empty response from Gemini API');
    } catch (e) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, e);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
      } else {
        return 'Summary generation failed. Please try again later.';
      }
    }
  }
  
  return 'Summary generation failed.';
}
