"use client";
import React, { useEffect, useState } from "react";
import ClinicianCard from "./ClinicianCard.jsx";
import ClinicianDetail from "./ClinicianDetail.jsx";

export default function ClinicianList({ initialClinicians }) {
  const [clinicians, setClinicians] = useState(initialClinicians || []);
  const [selected, setSelected] = useState(null);

  useEffect(() => setClinicians(initialClinicians || []), [initialClinicians]);

  if (selected) {
    return <ClinicianDetail clinician={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clinicians.map((c) => (
        <ClinicianCard key={c.id} clinician={c} onSelect={() => setSelected(c)} />
      ))}
    </section>
  );
}
