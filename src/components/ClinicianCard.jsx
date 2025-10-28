"use client";
import React from "react";

export default function ClinicianCard({ clinician, onSelect }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow hover:shadow-lg cursor-pointer transition-shadow" onClick={onSelect}>
      <div className="flex items-center gap-4">
        <img src={clinician.profilePicture || '/profile.svg'} alt={clinician.name} className="w-16 h-16 rounded-full object-cover" />
        <div>
          <h3 className="text-[#212C1B] font-semibold">{clinician.name}</h3>
          <p className="text-[#657F38] text-sm">{clinician.specialization}</p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-[#212C1B]">Avg Fit: <strong className="text-[#D57640]">{Number(clinician.avgStyleMatch||0).toFixed(1)}</strong></p>
      </div>
    </div>
  );
}
