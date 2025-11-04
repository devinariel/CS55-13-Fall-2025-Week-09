"use client";

import React, { useState, useEffect, useMemo } from "react";
import Filters from "./Filters";
import ClinicianCard from "./ClinicianCard";
import ClinicianDetail from "./ClinicianDetail";
import { getClinicians } from "../lib/firebase/therapyFirestore";

export default function ClinicianListings() {
  const [clinicians, setClinicians] = useState([]);
  const [selectedClinician, setSelectedClinician] = useState(null);
  const [filters, setFilters] = useState({
    city: "",
    specialization: "",
    modality: "",
    sort: "Rating",
  });

  useEffect(() => {
    async function fetchClinicians() {
      const fetchedClinicians = await getClinicians();
      setClinicians(fetchedClinicians);
    }
    fetchClinicians();
  }, []);

  const filteredClinicians = useMemo(() => {
    let filtered = [...clinicians];

    if (filters.city) {
      filtered = filtered.filter(
        (clinician) => clinician.city === filters.city
      );
    }

    if (filters.specialization) {
      filtered = filtered.filter(
        (clinician) => clinician.specialization === filters.specialization
      );
    }

    if (filters.modality) {
      filtered = filtered.filter(
        (clinician) => clinician.modality === filters.modality
      );
    }

    if (filters.sort === "Reviews") {
      filtered.sort((a, b) => (b.numRatings || 0) - (a.numRatings || 0));
    } else {
      // Default sort by Rating
      filtered.sort((a, b) => (b.avgStyleMatch || 0) - (a.avgStyleMatch || 0));
    }

    return filtered;
  }, [clinicians, filters]);

  if (selectedClinician) {
    return (
      <ClinicianDetail
        clinician={selectedClinician}
        onBack={() => setSelectedClinician(null)}
      />
    );
  }

  return (
    <>
      <Filters filters={filters} setFilters={setFilters} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {filteredClinicians.map((clinician) => (
          <ClinicianCard
            key={clinician.id}
            clinician={clinician}
            onSelect={() => setSelectedClinician(clinician)}
          />
        ))}
      </div>
    </>
  );
}