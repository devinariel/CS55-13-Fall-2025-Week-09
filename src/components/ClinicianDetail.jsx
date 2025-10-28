"use client";
import React, { useEffect, useState } from "react";
import SafetyBanner from "./SafetyBanner.jsx";
import ReviewForm from "./ReviewForm.jsx";
import { getReviewsForClinician } from "../lib/firebase/therapyFirestore";
import { generateReviewSummary } from "../lib/llm/generateReviewSummary";

export default function ClinicianDetail({ clinician, onBack }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    async function load() {
      const revs = await getReviewsForClinician(undefined, clinician.id);
      setReviews(revs || []);
      setLoadingSummary(true);
      const texts = (revs || []).map((r) => r.reviewText || "");
      const s = await generateReviewSummary(texts);
      setSummary(s);
      setLoadingSummary(false);
    }
    load();
  }, [clinician]);

  return (
    <div className="relative">
      <SafetyBanner />
      <button onClick={onBack} className="text-sm text-[#657F38] font-semibold hover:underline">← Back to list</button>
      <div className="mt-4 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <img src={clinician.profilePicture || '/profile.svg'} className="w-20 h-20 rounded-full object-cover" />
          <div>
            <h2 className="text-xl font-bold text-[#212C1B]">{clinician.name}</h2>
            <p className="text-[#657F38]">{clinician.specialization} · {clinician.city}</p>
            <p className="text-sm text-[#212C1B] mt-2">Avg Fit: <strong className="text-[#D57640]">{Number(clinician.avgStyleMatch||0).toFixed(1)}</strong></p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold text-[#657F38]">AI-Generated Thematic Summary</h3>
          {loadingSummary ? <p className="text-sm text-gray-600">✨ Generating summary with Gemini...</p> : <p className="text-sm text-[#212C1B] italic">{summary}</p>}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-semibold text-[#657F38]">Reviews</h3>
        {reviews.length === 0 && <p className="text-sm text-[#212C1B]">No reviews yet.</p>}
        <ul className="space-y-3 mt-3">
          {reviews.map((r) => (
            <li key={r.id} className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-[#212C1B]">{r.reviewText}</div>
              <div className="text-xs text-[#657F38] mt-2">Style Fit: <span className="font-bold text-[#D57640]">{r.styleMatch}</span> · Cultural Competence: <span className="font-bold text-[#D57640]">{r.culturalCompetence}</span></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <ReviewForm clinicianId={clinician.id} onSubmitted={() => window.location.reload()} />
      </div>
    </div>
  );
}
