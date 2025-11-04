"use client";
import React from "react";

export default function ClinicianCard({ clinician, onSelect }) {
  // Support both profilePicture and photo field names
  const imageUrl = clinician.profilePicture || clinician.photo || '/profile.svg';
  
  return (
    <div className="bg-white rounded-lg px-4 py-[15px] shadow hover:shadow-lg cursor-pointer transition-shadow" onClick={onSelect}>
      <div className="flex items-center gap-4">
        <img 
          src={imageUrl} 
          alt={clinician.name || 'Clinician'} 
          className="w-16 h-16 rounded-full object-cover"
          onError={(e) => {
            // Fallback to default profile icon if image fails to load
            e.target.src = '/profile.svg';
          }}
        />
        <div>
          <h3 className="text-[#68604D] font-semibold">{clinician.name || 'Unknown'}</h3>
          <p className="text-[#8A8E75] text-sm">{clinician.specialization || 'No specialization'}</p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-[#68604D]">Avg Fit: <strong className="text-[#BEC5A4]">{Number(clinician.avgStyleMatch||0).toFixed(1)}</strong></p>
      </div>
    </div>
  );
}
