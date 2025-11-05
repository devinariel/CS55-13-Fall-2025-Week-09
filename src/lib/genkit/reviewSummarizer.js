// Genkit-based review summarizer for clinician reviews
import "server-only";
import { genkit } from './config.js';

/**
 * Generate a summary of clinician reviews using Gemini via Genkit
 * @param {string[]} reviewTexts - Array of review text strings
 * @returns {Promise<string>} - Generated summary text
 */
export async function generateReviewSummaryWithGenkit(reviewTexts) {
  if (!reviewTexts || reviewTexts.length === 0) {
    return 'No reviews yet.';
  }

  // Filter out empty review texts
  const validTexts = reviewTexts.filter(text => text && text.trim().length > 0);
  if (validTexts.length === 0) {
    return 'No reviews yet.';
  }

  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY || process.env.TTC_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not found in environment variables');
    return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. Gemini API key not configured.`;
  }

  try {
    // Build prompt for Gemini
    const prompt = `Based on the following clinician reviews, create a concise one-sentence summary (max 100 words) of what people think of this mental health clinician. Focus on common themes, strengths, and overall fit.\n\nReviews:\n${validTexts.join('\n---\n')}`;

    // Use Genkit to call Gemini model
    // Try gemini-1.5-flash first, fallback to gemini-pro if needed
    let response;
    let lastError = null;

    const modelsToTry = [
      'googleai/gemini-1.5-flash',
      'googleai/gemini-pro',
      'googleai/gemini-2.0-flash-exp', // Try latest experimental model
    ];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying Genkit model: ${modelName}`);
        
        const model = genkit.ai(modelName);
        
        response = await model.generate({
          prompt: prompt,
          config: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          },
        });

        // If successful, break out of the loop
        if (response && (response.text || response.candidates?.[0]?.text)) {
          console.log(`Successfully used Genkit model: ${modelName}`);
          break;
        }
      } catch (error) {
        lastError = error;
        console.log(`Model ${modelName} failed, trying next...`, error.message);
        continue;
      }
    }

    // Extract the generated text
    if (!response) {
      throw lastError || new Error('All Genkit models failed');
    }

    // Handle different response formats
    const summary = response.text || 
                   response.candidates?.[0]?.text || 
                   response.candidates?.[0]?.content?.parts?.[0]?.text || 
                   '';
    
    if (!summary || summary.trim().length === 0) {
      throw new Error('Genkit returned empty response');
    }

    const summaryText = summary.trim();
    
    return summaryText;
  } catch (error) {
    console.error('Genkit error generating review summary:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Fallback message
    return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. Unable to generate AI summary: ${error.message}`;
  }
}

