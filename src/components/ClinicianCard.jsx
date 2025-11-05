"use client";
import React from "react";
import Link from "next/link";
import renderStars from "./Stars.jsx";

export default function ClinicianCard({ clinician }) {
  // Support both profilePicture and photo field names
  const imageUrl = clinician.profilePicture || clinician.photo || '/profile.svg';
  
  return (
    <Link 
      href={`/clinician/${clinician.id}`}
      className="clinician-card-modern bg-white rounded-lg shadow-sm hover:shadow-lg cursor-pointer transition-all duration-300 w-full max-w-sm mx-auto overflow-hidden border border-[#D5C7AD]/30 block"
      aria-label={`View profile for ${clinician.name || 'clinician'}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
        <div className="flex-shrink-0">
          <img 
            src={imageUrl} 
            alt={clinician.name || 'Clinician'} 
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover border-3 border-[#D5C7AD] shadow-sm"
            onError={(e) => {
              // Fallback to default profile icon if image fails to load (CORS or other errors)
              if (e.target.src && !e.target.src.includes('/profile.svg')) {
                e.target.src = '/profile.svg';
                e.target.onerror = null; // Prevent infinite loop
              }
            }}
          />
        </div>
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <h3 className="text-[#68604D] font-semibold text-lg mb-1.5 truncate leading-tight">
            {clinician.name || 'Unknown'}
          </h3>
          <p className="text-[#8A8E75] text-sm mb-2 truncate leading-relaxed">
            {clinician.specialization || 'No specialization'}
          </p>
          {clinician.avgRating && (
            <div className="flex items-center gap-2 mb-2">
              <ul className="flex items-center gap-0.5">{renderStars(clinician.avgRating)}</ul>
              <span className="text-xs text-[#8A8E75]">
                ({clinician.numRatings || 0})
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[#68604D]">Avg Fit:</span>
            <strong className="text-[#BEC5A4] font-semibold">
              {Number(clinician.avgStyleMatch||0).toFixed(1)}
            </strong>
          </div>
          {clinician.city && (
            <p className="text-xs text-[#8A8E75] mt-2 truncate">
              📍 {clinician.city}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
