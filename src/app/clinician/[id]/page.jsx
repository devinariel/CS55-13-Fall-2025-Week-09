import Clinician from "../../../components/Clinician.jsx";
import { Suspense } from "react";
import { getClinicianById } from "../../../lib/firebase/firestore.js";
import {
  getAuthenticatedAppForUser,
  getAuthenticatedAppForUser as getUser,
} from "../../../lib/firebase/serverApp.js";
import ReviewsList, {
  ReviewsListSkeleton,
} from "@/src/components/Reviews/ReviewsList";
import {
  GeminiSummary,
  GeminiSummarySkeleton,
} from "@/src/components/Reviews/ReviewSummary";
import { getFirestore } from "firebase/firestore";

export default async function Home(props) {
  const params = await props.params;
  const { currentUser } = await getUser();
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  const clinician = await getClinicianById(getFirestore(firebaseServerApp), params.id);

  return (
    <main className="main__restaurant">
      <Clinician
        id={params.id}
        initialClinician={clinician}
        initialUserId={currentUser?.uid || ""}
      >
        <Suspense fallback={<GeminiSummarySkeleton />}>
          <GeminiSummary clinicianId={params.id} />
        </Suspense>
      </Clinician>
      <Suspense
        fallback={<ReviewsListSkeleton numReviews={clinician.numRatings} />}
      >
        <ReviewsList clinicianId={params.id} userId={currentUser?.uid || ""} />
      </Suspense>
    </main>
  );
}
import Clinician from "../../../components/Clinician.jsx";
import { Suspense } from "react";
import { getClinicianById } from "../../../lib/firebase/firestore.js";
import {
  getAuthenticatedAppForUser,
  getAuthenticatedAppForUser as getUser,
} from "../../../lib/firebase/serverApp.js";
import ReviewsList, {
  ReviewsListSkeleton,
} from "@/src/components/Reviews/ReviewsList";
import {
  GeminiSummary,
  GeminiSummarySkeleton,
} from "@/src/components/Reviews/ReviewSummary";
import { getFirestore } from "firebase/firestore";

export default async function Page(props) {
  const params = await props.params;
  const { currentUser } = await getUser();
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  const clinician = await getClinicianById(
    getFirestore(firebaseServerApp),
    params.id
  );

  return (
    <main className="main__clinician">
      <Clinician
        id={params.id}
        initialClinician={clinician}
        initialUserId={currentUser?.uid || ""}
      >
        <Suspense fallback={<GeminiSummarySkeleton />}>
          <GeminiSummary clinicianId={params.id} />
        </Suspense>
      </Clinician>
      <Suspense
        fallback={<ReviewsListSkeleton numReviews={clinician.numRatings} />}
      >
        <ReviewsList clinicianId={params.id} userId={currentUser?.uid || ""} />
      </Suspense>
    </main>
  );
}
// force rebuild
