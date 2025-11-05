import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side API route to generate Gemini summaries
// This allows client components to request summaries without exposing the API key
export async function POST(request) {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON with reviewTexts array.' },
        { status: 400 }
      );
    }
    
    const { reviewTexts } = requestBody;

    if (!reviewTexts || !Array.isArray(reviewTexts) || reviewTexts.length === 0) {
      return NextResponse.json(
        { error: 'No review texts provided' },
        { status: 400 }
      );
    }

    // Filter out empty review texts
    const validTexts = reviewTexts.filter(text => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      return NextResponse.json(
        { error: 'No valid review texts' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.TTC_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Build prompt
    const prompt = `Based on the following clinician reviews, create a concise one-sentence summary (max 100 words) of what people think of this mental health clinician. Focus on common themes, strengths, and overall fit.\n\nReviews:\n${validTexts.join('\n---\n')}`;

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
        reviewTextsCount: validTexts.length,
        promptLength: prompt.length,
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

        // For 400/401/403 errors, check if it's an API key issue - don't try other models
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }
          
          console.log('API error response:', {
            status: response.status,
            errorData: errorData,
            model: config.model
          });
          
          // Check if it's an API key error
          const isApiKeyError = errorData?.error?.code === 400 && 
              (errorData?.error?.message?.includes('API key') || 
               errorData?.error?.message?.includes('not valid') ||
               errorData?.error?.details?.some(d => d.reason === 'API_KEY_INVALID'));
          
          if (isApiKeyError) {
            lastError = { 
              status: response.status, 
              message: errorText, 
              errorData: errorData,
              model: config.model, 
              version: config.version,
              apiKeyInvalid: true
            };
            console.error('API key is invalid! Stopping attempts.');
            break; // Don't try other models if API key is invalid
          }
          
          // For other 400/401/403 errors, still try next model
          lastError = { 
            status: response.status, 
            message: errorText, 
            errorData: errorData,
            model: config.model, 
            version: config.version
          };
          console.log(`Model ${config.model} returned ${response.status}, trying next...`);
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
      
      // Provide a more helpful error message
      let errorMessage = 'Gemini API models not available. ';
      
      // Check if API key is invalid
      if (lastError?.apiKeyInvalid || 
          (lastError?.status === 400 && lastError?.message?.includes('API key'))) {
        errorMessage = 'Gemini API key is invalid or not configured correctly. ';
        errorMessage += 'Please verify your GEMINI_API_KEY secret in Firebase App Hosting. ';
        errorMessage += 'Steps: 1) Go to Firebase Console → App Hosting → Secrets, ';
        errorMessage += '2) Verify GEMINI_API_KEY exists and is correct, ';
        errorMessage += '3) Get a new API key from https://aistudio.google.com/app/apikey if needed.';
        
        // Include the actual error details if available
        if (lastError?.errorData) {
          try {
            const errorDetails = typeof lastError.errorData === 'string' 
              ? JSON.parse(lastError.errorData) 
              : lastError.errorData;
            if (errorDetails?.error?.message) {
              errorMessage += ` Error: ${errorDetails.error.message}`;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      } else if (lastError?.status === 404) {
        errorMessage += 'The requested model was not found. Please check your API key has access to Gemini models. ';
      } else if (lastError?.status === 401 || lastError?.status === 403) {
        errorMessage += 'Authentication failed. Please verify your API key is correct and has proper permissions. ';
      } else if (lastError?.status === 429) {
        errorMessage += 'Rate limit exceeded. Please try again later. ';
      } else {
        errorMessage += `Last attempt returned ${lastError?.status || 'unknown'} status. `;
        
        // Try to include more details from the error
        if (lastError?.errorData?.error?.message) {
          errorMessage += ` Details: ${lastError.errorData.error.message}`;
        } else if (lastError?.message) {
          try {
            const parsed = JSON.parse(lastError.message);
            if (parsed?.error?.message) {
              errorMessage += ` Details: ${parsed.error.message}`;
            }
          } catch (e) {
            // If not JSON, include first 100 chars of message
            errorMessage += ` Details: ${lastError.message.substring(0, 100)}`;
          }
        }
      }
      
      if (!lastError?.apiKeyInvalid) {
        errorMessage += ` Tried models: ${modelConfigs.map(c => c.model).join(', ')}.`;
      }
      
      // Log full error details for debugging
      console.error('Final error response:', {
        errorMessage,
        lastError,
        apiKeyPresent: !!process.env.GEMINI_API_KEY || !!process.env.TTC_GEMINI_API_KEY,
        apiKeyLength: (process.env.GEMINI_API_KEY || process.env.TTC_GEMINI_API_KEY || '').length
      });
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: {
            status: lastError?.status,
            model: lastError?.model,
            version: lastError?.version,
            // Include error message but limit size
            errorMessage: lastError?.message ? lastError.message.substring(0, 500) : undefined,
            errorData: lastError?.errorData ? (typeof lastError.errorData === 'string' 
              ? lastError.errorData.substring(0, 500) 
              : JSON.stringify(lastError.errorData).substring(0, 500)) : undefined
          },
          triedModels: lastError?.apiKeyInvalid ? [] : modelConfigs.map(c => `${c.model} (${c.version})`)
        },
        { status: 500 }
      );
    }

    console.log(`Successfully used model: ${successfulModel}`);

    const data = await response.json();
    console.log('Gemini API response received');

    // Extract the generated text from the response
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
      return NextResponse.json(
        { error: 'Gemini API returned empty response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary: text.trim() });
  } catch (error) {
    console.error('Error in generate-summary API route:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
    // Provide a more helpful error message
    let errorMessage = 'Internal server error while generating summary.';
    if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      },
      { status: 500 }
    );
  }
}

// Optional GET handler for testing/debugging
export async function GET() {
  return NextResponse.json({ 
    message: 'Generate Summary API endpoint',
    method: 'POST',
    description: 'Send review texts in the request body: { reviewTexts: string[] }',
    status: 'ok'
  });
}

