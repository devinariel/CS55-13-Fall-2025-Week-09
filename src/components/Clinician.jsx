"use client";

// Removed duplicate React import, combined useState/useEffect
import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { getClinicianSnapshotById } from "../lib/firebase/firestore.js";
import { useUser } from "../lib/getUser.js";
import ClinicianDetails from "./ClinicianDetails.jsx"; // Assuming this path is correct relative to Clinician.jsx
import { updateClinicianImage } from "../lib/firebase/storage.js";

const ReviewDialog = dynamic(() => import("./ReviewDialog.jsx")); // Assuming this path is correct

// Kept the first, more complete component definition
export default function Clinician({ id, initialClinician, initialUserId, children }) {
  const [clinicianDetails, setClinicianDetails] = useState(initialClinician);
  const [isOpen, setIsOpen] = useState(false);

  const userId = useUser()?.uid || initialUserId;
  const [review, setReview] = useState({ rating: 0, text: "" });

  const onChange = (value, name) => {
    setReview({ ...review, [name]: value });
  };

  async function handleClinicianImage(target) {
    const image = target.files ? target.files[0] : null;
    if (!image) return;

    try {
      const imageURL = await updateClinicianImage(id, image);
      setClinicianDetails((prevDetails) => ({ ...prevDetails, photo: imageURL }));
    } catch (error) {
      console.error("Error updating clinician image:", error);
      // Optionally show an error message to the user
    }
  }

  const handleClose = () => {
    setIsOpen(false);
    setReview({ rating: 0, text: "" });
  };

  useEffect(() => {
    // Check if id is valid before subscribing
    if (!id) return;
    const unsubscribe = getClinicianSnapshotById(id, (data) => {
      if (data) { // Ensure data exists before setting state
        setClinicianDetails(data);
      } else {
        console.warn(`Clinician data not found for id: ${id}`);
        // Handle case where clinician data might become null/undefined
      }
    });
    // Return the unsubscribe function for cleanup
    return () => unsubscribe();
  }, [id]); // Dependency array is correct

  return (
    <>
      <ClinicianDetails
        clinician={clinicianDetails}
        userId={userId}
        handleClinicianImage={handleClinicianImage}
        setIsOpen={setIsOpen} // Prop to open the dialog
        isOpen={isOpen}       // Prop to check if dialog should be open (though ReviewDialog controls its own state)
      >
        {children}
      </ClinicianDetails>
      {userId && (
        <Suspense fallback={<p>Loading review dialog...</p>}>
          <ReviewDialog
            isOpen={isOpen}
            handleClose={handleClose}
            review={review}
            onChange={onChange}
            userId={userId}
            clinicianId={id} // Pass clinician id correctly
          />
        </Suspense>
      )}
    </>
  );
}