import ClinicianDetailComponent from "../../../components/Clinician.jsx";
import { Suspense } from "react";
import { getClinicianById } from "../../../lib/firebase/therapyFirestore.js";
import {
  getAuthenticatedAppForUser,
  getAuthenticatedAppForUser as getUser, // Keep alias if used elsewhere, otherwise redundant
} from "../../../lib/firebase/serverApp.js";
import ReviewsList, {
  ReviewsListSkeleton,
} from "@/src/components/Reviews/ReviewsList";
import {
  GeminiSummary,
  GeminiSummarySkeleton,
} from "@/src/components/Reviews/ReviewSummary";
import { getFirestore } from "firebase/firestore";

// Renamed function to Page for Next.js App Router convention
export default async function Page(props) {
  // Use `props.params` directly as recommended in Next.js 13+ App Router
  const params = props.params;
  const { currentUser } = await getUser();
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  const clinician = await getClinicianById(getFirestore(firebaseServerApp), params.id);

  // Handle case where clinician might not be found
  if (!clinician) {
    // Optionally return a 404 page or a specific component
    return <div>Clinician not found.</div>;
  }

  return (
    // Updated className to reflect clinician focus
    <main className="main__clinician p-4 md:p-6 lg:p-8 max-w-6xl mx-auto" style={{ marginLeft: '25px' }}>
      {/* Use the imported alias ClinicianDetailComponent */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <ClinicianDetailComponent
          id={params.id}
          initialClinician={clinician}
          initialUserId={currentUser?.uid || ""}
        >
          <Suspense fallback={<GeminiSummarySkeleton />}>
            <GeminiSummary clinicianId={params.id} />
          </Suspense>
        </ClinicianDetailComponent>
      </div>

      {/* Reviews Section */}
      <div className="mt-8" style={{ marginLeft: '25px' }}>
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-[#68604D]">Reviews</h2>
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <Suspense
            fallback={<ReviewsListSkeleton numReviews={clinician.numRatings} />}
          >
            <ReviewsList clinicianId={params.id} userId={currentUser?.uid || ""} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

// force rebuild
