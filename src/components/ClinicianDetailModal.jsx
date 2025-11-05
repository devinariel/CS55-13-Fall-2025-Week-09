"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import renderStars from "./Stars.jsx";
import ReviewsListClient from "./Reviews/ReviewsListClient";
import { getReviewsByClinicianId } from "../lib/firebase/therapyFirestore";
import { useUser } from "../lib/getUser";

export default function ClinicianDetailModal({ clinician, isOpen, onClose }) {
  const user = useUser();
  const [initialReviews, setInitialReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInitialReviews([]);
      setSummary('');
      setLoadingReviews(true);
      setLoadingSummary(false);
    }
  }, [isOpen]);

  // Load reviews when modal opens
  useEffect(() => {
    if (isOpen && clinician?.id) {
      setLoadingReviews(true);
      getReviewsByClinicianId(undefined, clinician.id)
        .then((reviews) => {
          setInitialReviews(reviews || []);
          setLoadingReviews(false);
        })
        .catch((error) => {
          console.error('Error loading reviews:', error);
          setInitialReviews([]);
          setLoadingReviews(false);
        });
    }
  }, [isOpen, clinician?.id]);

  // Load AI summary when modal opens and reviews are loaded
  useEffect(() => {
    // Only fetch summary if modal is open, has clinician ID, reviews are loaded, and not currently loading reviews
    if (!isOpen || !clinician?.id || loadingReviews) {
      return;
    }

    // If no reviews, clear summary
    if (initialReviews.length === 0) {
      setSummary('');
      setLoadingSummary(false);
      return;
    }

    // Extract review texts
    const reviewTexts = initialReviews
      .map((review) => review.text || review.reviewText || '')
      .filter((text) => text.trim().length > 0);

    // If no valid review texts, clear summary
    if (reviewTexts.length === 0) {
      setSummary('');
      setLoadingSummary(false);
      return;
    }

    // Fetch summary from API
    setLoadingSummary(true);
    fetch('/api/generate-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reviewTexts }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          console.error('Error generating summary:', data.error);
          setSummary(`Based on ${reviewTexts.length} ${reviewTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients.`);
        } else {
          setSummary(data.summary || '');
        }
        setLoadingSummary(false);
      })
      .catch((error) => {
        console.error('Error fetching summary:', error);
        setSummary(`Based on ${reviewTexts.length} ${reviewTexts.length === 1 ? 'review' : 'reviews'}, this clinician has received feedback from patients.`);
        setLoadingSummary(false);
      });
  }, [isOpen, clinician?.id, initialReviews, loadingReviews]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open and visible
  useEffect(() => {
    if (isOpen && clinician) {
      // Only lock scroll if modal is actually visible
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = 'hidden';
      // Prevent scroll on mobile
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
        document.body.style.position = originalPosition || 'unset';
        document.body.style.width = 'unset';
      };
    } else {
      // Always unlock scroll when modal is closed
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
    }
  }, [isOpen, clinician]);

  // Debug logging
  useEffect(() => {
    if (isOpen && clinician) {
      console.log('Modal should be visible:', { 
        isOpen, 
        clinicianId: clinician?.id, 
        clinicianName: clinician?.name,
        hasBackdrop: true,
        hasModal: true
      });
    }
  }, [isOpen, clinician]);

  if (!isOpen || !clinician) {
    return null;
  }

  const imageUrl = clinician.profilePicture || clinician.photo || '/profile.svg';

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fixed inset-0 bg-[#68604D] backdrop-blur-sm animate-fade-in"
        style={{ 
          zIndex: 998,
          opacity: 0.7,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="modal-container fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
        style={{ 
          zIndex: 999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div 
          className="modal-content bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
          style={{
            position: 'relative',
            zIndex: 1000,
            pointerEvents: 'auto'
          }}
        >
          {/* Header */}
          <div className="modal-header bg-gradient-to-r from-[#68604D] to-[#8A8E75] text-white p-6 flex items-start justify-between relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-[#F1EAD8] transition-colors duration-200 p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex gap-4 items-start pr-10 w-full">
              <img
                src={imageUrl}
                alt={clinician.name || 'Clinician'}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white/50 shadow-lg flex-shrink-0"
                onError={(e) => {
                  // Fallback to default profile icon if image fails to load (CORS or other errors)
                  if (e.target.src && !e.target.src.includes('/profile.svg')) {
                    e.target.src = '/profile.svg';
                    e.target.onerror = null; // Prevent infinite loop
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <h2 id="modal-title" className="text-2xl md:text-3xl font-bold mb-2 text-white leading-tight">
                  {clinician.name || 'Unknown'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {clinician.avgRating && (
                    <div className="flex items-center gap-2">
                      <ul className="flex items-center gap-0.5">{renderStars(clinician.avgRating)}</ul>
                      <span className="text-sm text-white/90">
                        ({clinician.numRatings || 0} reviews)
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-white/80">Avg Fit: <strong className="text-[#BEC5A4]">{Number(clinician.avgStyleMatch||0).toFixed(1)}</strong></span>
                </div>
                <p className="text-white/90 text-base mb-1 leading-relaxed">
                  {clinician.specialization || 'No specialization'}
                </p>
                <p className="text-white/80 text-sm">
                  {clinician.city && `📍 ${clinician.city}`}
                  {clinician.modality && ` • ${clinician.modality}`}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="modal-body flex-1 overflow-y-auto p-6 space-y-6">
            {/* AI Summary Section */}
            <div className="ai-summary-section">
              <h3 className="text-lg font-semibold text-[#68604D] mb-3">AI-Generated Summary</h3>
              {loadingSummary ? (
                <div className="clinician__review_summary">
                  <p className="text-[#8A8E75] text-base">✨ Summarizing reviews with Gemini...</p>
                </div>
              ) : summary ? (
                <div className="clinician__review_summary">
                  <p className="text-[#68604D] text-base leading-relaxed">{summary}</p>
                  <p className="text-sm text-[#8A8E75] mt-2 italic">✨ Summarized with Gemini via Genkit</p>
                </div>
              ) : (
                <div className="clinician__review_summary">
                  <p className="text-[#8A8E75] italic text-base">No reviews yet. Be the first to share your experience!</p>
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div className="reviews-section">
              <h3 className="text-lg font-semibold text-[#68604D] mb-4">Reviews</h3>
              <div className="bg-[#F1EAD8]/30 rounded-lg p-4">
                {loadingReviews ? (
                  <p className="text-[#8A8E75] text-sm">Loading reviews...</p>
                ) : (
                  <ReviewsListClient 
                    initialReviews={initialReviews} 
                    clinicianId={clinician.id} 
                    userId={user?.uid || ""} 
                  />
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-t border-[#D5C7AD] bg-[#F1EAD8]/30 p-4 flex justify-end gap-3">
            <Link
              href={`/clinician/${clinician.id}`}
              className="px-6 py-2 bg-[#8A8E75] text-white rounded-lg hover:bg-[#BEC5A4] transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#8A8E75] focus:ring-offset-2"
              onClick={onClose}
            >
              View Full Profile
            </Link>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white text-[#8A8E75] border border-[#D5C7AD] rounded-lg hover:bg-[#F1EAD8] transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#8A8E75] focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

