"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import renderStars from "./Stars.jsx";
import ReviewsListClient from "./Reviews/ReviewsListClient";
import { getReviewsByClinicianId } from "../lib/firebase/therapyFirestore";
import { useUser } from "../lib/getUser";

export default function ClinicianDetailModal({ clinician, isOpen, onClose }) {
  const router = useRouter();
  const { user } = useUser();
  const [initialReviews, setInitialReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

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
    if (isOpen && clinician?.id && initialReviews.length > 0 && !loadingReviews) {
      setLoadingSummary(true);
      const reviewTexts = initialReviews
        .map((review) => review.text || review.reviewText || '')
        .filter((text) => text.trim().length > 0);

      if (reviewTexts.length === 0) {
        setSummary('');
        setLoadingSummary(false);
        return;
      }

      fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewTexts }),
      })
        .then((res) => res.json())
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
    } else if (isOpen && initialReviews.length === 0 && !loadingReviews) {
      setSummary('');
      setLoadingSummary(false);
    }
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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !clinician) return null;

  const imageUrl = clinician.profilePicture || clinician.photo || '/profile.svg';

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fixed inset-0 bg-[#68604D]/70 backdrop-blur-sm z-[998] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="modal-container fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-content bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
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
                  e.target.src = '/profile.svg';
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

