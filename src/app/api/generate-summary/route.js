import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side API route to generate Gemini summaries
// This route now calls the Firebase Function instead of direct API calls
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

    // Call the Firebase Function instead of direct API calls
    const projectId = process.env.TTC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'the-therapy-compass';
    const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/generateReviewSummary`;
    
    console.log('API route calling Firebase Function:', functionUrl, 'with', validTexts.length, 'reviews');

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            reviewTexts: validTexts,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Firebase Function error:', response.status, errorText);
        return NextResponse.json(
          { error: `Firebase Function returned ${response.status}: ${errorText}` },
          { status: response.status }
        );
      }

      const result = await response.json();
      const summary = result?.result?.summary || result?.summary || '';
      
      if (!summary || summary.trim().length === 0) {
        return NextResponse.json(
          { error: 'Firebase Function returned empty summary' },
          { status: 500 }
        );
      }

      return NextResponse.json({ summary: summary.trim() });
    } catch (fetchError) {
      console.error('Error calling Firebase Function:', fetchError);
      return NextResponse.json(
        { error: `Failed to call Firebase Function: ${fetchError.message}` },
        { status: 500 }
      );
    }
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
    status: 'ok',
    note: 'This route now calls the Firebase Function generateReviewSummary'
  });
}
