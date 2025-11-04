"use client";
import React from "react";

export default function SafetyBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#68604D] text-[#F1EAD8] font-bold p-3 text-center z-50 shadow-lg">
      ⚠️ In Crisis? This app is NOT for emergencies. Call/Text 988 or go to the nearest ER.
    </div>
  );
}
