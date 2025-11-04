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
    return <p className="text-sm text-[#68604D]">Sign in to submit a verified review.</p>;
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
    <select 
      value={value} 
      onChange={(e) => setter(Number(e.target.value))} 
      className="border-2 border-[#D5C7AD] rounded px-3 py-2 bg-white text-[#68604D] focus:outline-none focus:border-[#8A8E75]"
    >
      {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} ★</option>)}
    </select>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg">
      <h4 className="font-semibold text-[#68604D] text-lg mb-4">Submit a Verified Review</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <label className="text-sm text-[#68604D] flex flex-col gap-1">
          <span>Style Match</span>
          {starInput(styleMatch, setStyleMatch)}
        </label>
        <label className="text-sm text-[#68604D] flex flex-col gap-1">
          <span>Modality Expertise</span>
          {starInput(modalityExpertise, setModalityExpertise)}
        </label>
        <label className="text-sm text-[#68604D] flex flex-col gap-1">
          <span>Accessibility</span>
          {starInput(accessibility, setAccessibility)}
        </label>
        <label className="text-sm text-[#68604D] flex flex-col gap-1">
          <span>Cultural Competence</span>
          {starInput(culturalCompetence, setCulturalCompetence)}
        </label>
      </div>
      <div className="mt-4">
        <textarea 
          value={reviewText} 
          onChange={(e) => setReviewText(e.target.value)} 
          rows={4} 
          className="w-full border-2 border-[#D5C7AD] rounded p-3 bg-white text-[#68604D] focus:outline-none focus:border-[#8A8E75]" 
          placeholder="Share your experience..." 
        />
      </div>
      <div className="mt-4">
        <label className="text-sm text-[#68604D] flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={verified} 
            onChange={(e) => setVerified(e.target.checked)}
            className="w-4 h-4 text-[#8A8E75] border-[#D5C7AD] rounded focus:ring-[#BEC5A4]"
          /> 
          I confirm I've had at least 3 sessions with this clinician
        </label>
      </div>
      <div className="mt-4">
        <button className="bg-[#8A8E75] text-white px-6 py-2 rounded hover:bg-[#BEC5A4] transition-colors font-semibold">Submit Review</button>
      </div>
    </form>
  );
}
