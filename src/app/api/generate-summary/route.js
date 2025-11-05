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

    // Try gemini-1.5-flash first, fallback to gemini-1.5-pro if needed
    let model = 'gemini-1.5-flash';
    let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log('Calling Gemini API from API route:', {
      model: model,
      reviewTextsCount: validTexts.length,
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
      return NextResponse.json(
        { error: `Failed to connect to Gemini API: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        model: model
      });

      return NextResponse.json(
        { error: `Gemini API returned ${response.status}: ${errorText.substring(0, 200)}` },
        { status: response.status }
      );
    }

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

