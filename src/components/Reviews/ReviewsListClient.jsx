"use client";

import React, { useState, useEffect } from "react";
import { getReviewsSnapshotByClinicianId } from "@/src/lib/firebase/therapyFirestore.js";
import { Review } from "@/src/components/Reviews/Review";

export default function ReviewsListClient({ initialReviews, clinicianId, userId }) {
  const [reviews, setReviews] = useState(initialReviews);

  useEffect(() => {
  return getReviewsSnapshotByClinicianId(clinicianId, (data) => {
      setReviews(data);
    });
  }, [clinicianId]);
  return (
    <article>
      <ul className="reviews">
    {reviews.length > 0 ? (
          <ul>
            {reviews.map((review) => (
              <Review
                key={review.id}
                rating={review.rating}
                text={review.text}
                timestamp={review.timestamp}
              />
            ))}
          </ul>
        ) : (
          <p>
      This clinician has not been reviewed yet,{" "}
      {!userId ? "first login and then" : ""} add your own review!
          </p>
        )}
      </ul>
    </article>
  );
}
