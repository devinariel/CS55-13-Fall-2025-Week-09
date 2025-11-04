"use client";

import React, { useState, useEffect, useMemo } from "react";
import Filters from "./Filters";
import ClinicianCard from "./ClinicianCard";
import ClinicianDetail from "./ClinicianDetail";
import { getClinicians } from "../lib/firebase/therapyFirestore";

export default function ClinicianListings() {
  const [clinicians, setClinicians] = useState([]);
  const [selectedClinician, setSelectedClinician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    city: "",
    specialization: "",
    modality: "",
    sort: "Rating",
  });

  useEffect(() => {
    async function fetchClinicians() {
      try {
        setLoading(true);
        setError(null);
        const fetchedClinicians = await getClinicians();
        console.log("Fetched clinicians:", fetchedClinicians);
        setClinicians(fetchedClinicians || []);
      } catch (err) {
        console.error("Error fetching clinicians:", err);
        setError(err.message || "Failed to load clinicians");
      } finally {
        setLoading(false);
      }
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

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-[#68604D]">Loading clinicians...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Error: {error}</p>
        <p className="text-sm text-[#68604D] mt-2">
          Make sure you're signed in and have permission to read clinicians.
        </p>
      </div>
    );
  }

  if (filteredClinicians.length === 0) {
    return (
      <>
        <Filters filters={filters} setFilters={setFilters} />
        <div className="p-4 mt-4">
          <p className="text-[#68604D]">
            {clinicians.length === 0 
              ? "No clinicians found. Sign in and click 'Add Sample Clinicians' in the header to add sample data."
              : "No clinicians match your filters. Try adjusting your search criteria."}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Filters filters={filters} setFilters={setFilters} />
      <div className="flex justify-center mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
          {filteredClinicians.map((clinician) => (
            <ClinicianCard
              key={clinician.id}
              clinician={clinician}
              onSelect={() => setSelectedClinician(clinician)}
            />
          ))}
        </div>
      </div>
    </>
  );
}