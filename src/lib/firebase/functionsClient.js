// Helper to call Firebase Functions from client components
"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "./clientApp";

/**
 * Call the generateReviewSummary Firebase Function from client-side
 * @param {string[]} reviewTexts - Array of review text strings
 * @returns {Promise<string>} - Generated summary text
 */
export async function callGenerateReviewSummaryClient(reviewTexts) {
  if (!reviewTexts || reviewTexts.length === 0) {
    return 'No reviews yet.';
  }

  // Filter out empty review texts
  const validTexts = reviewTexts.filter(text => text && text.trim().length > 0);
  if (validTexts.length === 0) {
    return 'No reviews yet.';
  }

  try {
    const functions = getFunctions(firebaseApp);
    const generateReviewSummary = httpsCallable(functions, 'generateReviewSummary');
    
    console.log('Calling Firebase Function (client): generateReviewSummary with', validTexts.length, 'reviews');

    const result = await generateReviewSummary({
      reviewTexts: validTexts,
    });

    const summary = result?.data?.summary || '';
    
    if (!summary || summary.trim().length === 0) {
      return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients.`;
    }

    return summary.trim();
  } catch (error) {
    console.error('Error calling Firebase Function (client):', error);
    return `Based on ${validTexts.length} ${validTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients. Unable to generate AI summary: ${error.message}`;
  }
}

