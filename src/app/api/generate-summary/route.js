import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side API route to generate Gemini summaries
// This allows client components to request summaries without exposing the API key
export async function POST(request) {
  try {
    const { reviewTexts } = await request.json();

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

    // Try different models and API versions in order
    const modelConfigs = [
      { model: 'gemini-1.5-flash', version: 'v1beta' },
      { model: 'gemini-1.5-flash', version: 'v1' },
      { model: 'gemini-pro', version: 'v1beta' },
      { model: 'gemini-pro', version: 'v1' },
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
      return NextResponse.json(
        { 
          error: `Gemini API models not available. Last attempt: ${lastError?.status || 'unknown'} - ${lastError?.message?.substring(0, 200) || lastError?.error || 'Unknown error'}`,
          details: lastError
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
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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

