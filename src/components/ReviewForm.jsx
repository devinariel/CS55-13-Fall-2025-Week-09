"use client";
import React, { useState, useEffect } from "react";
import { submitReview } from "../lib/firebase/therapyFirestore";
import { auth } from "../lib/firebase/clientApp";

export default function ReviewForm({ clinicianId, onSubmitted }) {
  const [styleMatch, setStyleMatch] = useState(5);
  const [modalityExpertise, setModalityExpertise] = useState(5);
  const [accessibility, setAccessibility] = useState(5);
  const [culturalCompetence, setCulturalCompetence] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [verified, setVerified] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(auth.currentUser || null);
  }, []);

  if (!user) {
    return <p className="text-sm text-[#212C1B]">Sign in to submit a verified review.</p>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verified) return alert("Please confirm you've had at least 3 sessions.");
    const review = {
      userId: user.uid,
      styleMatch,
      modalityExpertise,
      accessibility,
      culturalCompetence,
      reviewText,
    };
    await submitReview(undefined, clinicianId, review);
    onSubmitted && onSubmitted();
  };

  const starInput = (value, setter) => (
    <select value={value} onChange={(e) => setter(Number(e.target.value))} className="border rounded px-2 py-1 bg-white text-[#212C1B]">
      {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} ★</option>)}
    </select>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow">
      <h4 className="font-semibold text-[#657F38]">Submit a Verified Review</h4>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <label className="text-sm">Style Match {starInput(styleMatch, setStyleMatch)}</label>
        <label className="text-sm">Modality Expertise {starInput(modalityExpertise, setModalityExpertise)}</label>
        <label className="text-sm">Accessibility {starInput(accessibility, setAccessibility)}</label>
        <label className="text-sm">Cultural Competence {starInput(culturalCompetence, setCulturalCompetence)}</label>
      </div>
      <div className="mt-2">
        <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} className="w-full border rounded p-2 bg-white" placeholder="Share your experience..." />
      </div>
      <div className="mt-2">
        <label className="text-sm"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> I confirm I've had at least 3 sessions with this clinician</label>
      </div>
      <div className="mt-3">
        <button className="bg-[#657F38] text-white px-4 py-2 rounded hover:bg-[#9EAB57] transition-colors">Submit Review</button>
      </div>
    </form>
  );
}
