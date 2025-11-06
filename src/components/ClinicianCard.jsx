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
      className="clinician-card-psychology-today bg-white rounded-lg shadow-md hover:shadow-xl cursor-pointer transition-all duration-300 w-full overflow-hidden border border-gray-200 block"
      aria-label={`View profile for ${clinician.name || 'clinician'}`}
    >
      {/* Image Section - Full Width at Top */}
      <div className="clinician-card-image-wrapper w-full h-48 bg-gray-100 overflow-hidden">
        <img 
          src={imageUrl} 
          alt={clinician.name || 'Clinician'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to default profile icon if image fails to load (CORS or other errors)
            if (e.target.src && !e.target.src.includes('/profile.svg')) {
              e.target.src = '/profile.svg';
              e.target.onerror = null; // Prevent infinite loop
            }
          }}
        />
      </div>
      
      {/* Content Section - Below Image */}
      <div className="clinician-card-content p-5">
        <h3 className="text-[#68604D] font-semibold text-lg mb-2 leading-tight">
          {clinician.name || 'Unknown'}
        </h3>
        
        <p className="text-[#8A8E75] text-sm mb-3 leading-relaxed">
          {clinician.specialization || 'No specialization'}
        </p>
        
        {clinician.avgRating && (
          <div className="flex items-center gap-2 mb-3">
            <ul className="flex items-center gap-0.5">{renderStars(clinician.avgRating, 'md')}</ul>
            <span className="text-sm text-[#8A8E75] font-medium">
              {Number(clinician.avgRating).toFixed(1)} ({clinician.numRatings || 0} {clinician.numRatings === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm mb-2">
          <span className="text-[#68604D]">Style Match:</span>
          <strong className="text-[#BEC5A4] font-semibold">
            {Number(clinician.avgStyleMatch||0).toFixed(1)}/5.0
          </strong>
        </div>
        
        {clinician.city && (
          <p className="text-sm text-[#8A8E75] mt-2 flex items-center gap-1">
            <span>📍</span>
            <span>{clinician.city}</span>
          </p>
        )}
        
        {clinician.modality && (
          <p className="text-xs text-[#8A8E75] mt-2 italic">
            {clinician.modality}
          </p>
        )}
      </div>
    </Link>
  );
}
