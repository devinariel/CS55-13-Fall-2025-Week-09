"use client";
import React from "react";

export default function ClinicianCard({ clinician, onSelect }) {
  return (
    <div className="bg-[#d2e1cc] rounded-lg p-4 shadow hover:shadow-md cursor-pointer" onClick={onSelect}>
      <div className="flex items-center gap-4">
        <img src={clinician.profilePicture || '/profile.svg'} alt={clinician.name} className="w-16 h-16 rounded-full object-cover" />
        <div>
          <h3 className="text-[#161d23] font-semibold">{clinician.name}</h3>
          <p className="text-[#5e8d83] text-sm">{clinician.specialization}</p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-[#161d23]">Avg Fit: <strong>{Number(clinician.avgStyleMatch||0).toFixed(1)}</strong></p>
      </div>
    </div>
  );
}
