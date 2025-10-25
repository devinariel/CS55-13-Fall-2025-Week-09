"use client";

import { React, useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { getClinicianSnapshotById } from "../lib/firebase/firestore.js";
import { useUser } from "../lib/getUser.js";
import ClinicianDetails from "./ClinicianDetails.jsx";
import { updateClinicianImage } from "../lib/firebase/storage.js";

const ReviewDialog = dynamic(() => import("./ReviewDialog.jsx"));

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

    const imageURL = await updateClinicianImage(id, image);
    setClinicianDetails({ ...clinicianDetails, photo: imageURL });
  }

  const handleClose = () => {
    setIsOpen(false);
    setReview({ rating: 0, text: "" });
  };

  useEffect(() => {
    return getClinicianSnapshotById(id, (data) => {
      setClinicianDetails(data);
    });
  }, [id]);

  return (
    <>
      <ClinicianDetails
        clinician={clinicianDetails}
        userId={userId}
        handleClinicianImage={handleClinicianImage}
        setIsOpen={setIsOpen}
        isOpen={isOpen}
      >
        {children}
      </ClinicianDetails>
      {userId && (
        <Suspense fallback={<p>Loading...</p>}>
          <ReviewDialog
            isOpen={isOpen}
            handleClose={handleClose}
            review={review}
            onChange={onChange}
            userId={userId}
            id={id}
          />
        </Suspense>
      )}
    </>
  );
}
import { useState, useEffect } from "react";
import { getClinicianSnapshotById } from "../lib/firebase/firestore.js";
import ClinicianDetails from "./ClinicianDetails.jsx";
import { updateClinicianImage } from "../lib/firebase/storage.js";

export default function Clinician({ id, initialClinician, children }) {
  const [clinicianDetails, setClinicianDetails] = useState(initialClinician);

  async function handleClinicianImage(target) {
    const image = target.files[0];
    if (!image) return;
    const imageURL = await updateClinicianImage(id, image);
    setClinicianDetails({ ...clinicianDetails, photo: imageURL });
  }

  useEffect(() => {
    if (!id) return;
    return getClinicianSnapshotById(id, (data) => setClinicianDetails(data));
  }, [id]);

  return (
    <section>
      <ClinicianDetails
        clinician={clinicianDetails}
        handleClinicianImage={handleClinicianImage}
      >
        {children}
      </ClinicianDetails>
    </section>
  );
}
