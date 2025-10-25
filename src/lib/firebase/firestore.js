// Import generator for fake clinicians and reviews used in dev/testing
import { generateFakeCliniciansAndReviews } from "../fakeRestaurants.js";

// Import Firestore functions we use across this module
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  Timestamp,
  runTransaction,
  where,
  addDoc,
  getFirestore,
} from "firebase/firestore";

// Import the already-initialized client-side Firestore instance
import { db } from "./clientApp";

// Update the photo reference on a clinician document
export async function updateClinicianImageReference(clinicianId, publicImageUrl) {
  const clinicianRef = doc(collection(db, "clinicians"), clinicianId);
  if (clinicianRef) {
    await updateDoc(clinicianRef, { photo: publicImageUrl });
  }
}

// helper used inside transactions to update rating counts and set the rating doc
const updateWithRating = async (
  transaction,
  docRef,
  newRatingDocument,
  review
) => {
  // read the clinician document inside the transaction
  const clinician = await transaction.get(docRef);
  const data = clinician.data();
  // compute new counts and sums for ratings
  const newNumRatings = data?.numRatings ? data.numRatings + 1 : 1;
  const newSumRating = (data?.sumRating || 0) + Number(review.rating);
  const newAverage = newSumRating / newNumRatings;

  // update the clinician summary fields in the transaction
  transaction.update(docRef, {
    numRatings: newNumRatings,
    sumRating: newSumRating,
    avgRating: newAverage,
  });

  // create the new rating document with a timestamp
  transaction.set(newRatingDocument, {
    ...review,
    timestamp: Timestamp.fromDate(new Date()),
  });
};

// Add a review to a clinician using a transaction to keep counts consistent
export async function addReviewToClinician(db, clinicianId, review) {
  // validate inputs
  if (!clinicianId) {
    throw new Error("No clinician ID has been provided.");
  }

  if (!review) {
    throw new Error("A valid review has not been provided.");
  }

  try {
    // reference the clinician document
    const docRef = doc(collection(db, "clinicians"), clinicianId);
    // create a new document reference for the rating subcollection
    const newRatingDocument = doc(
      collection(db, `clinicians/${clinicianId}/ratings`)
    );

    // run a transaction that updates restaurant counts and sets the rating
    await runTransaction(db, (transaction) =>
      updateWithRating(transaction, docRef, newRatingDocument, review)
    );
  } catch (error) {
    // log and rethrow any errors
  console.error("There was an error adding the rating to the clinician", error);
    throw error;
  }
}

// Apply filters to a Firestore query based on the passed filters object
function applyQueryFilters(q, { category, city, price, sort }) {
  // filter by category if provided
  if (category) {
    q = query(q, where("category", "==", category));
  }
  // filter by city if provided
  if (city) {
    q = query(q, where("city", "==", city));
  }
  // filter by price level if provided (uses length of price string)
  if (price) {
    q = query(q, where("price", "==", price.length));
  }
  // apply sort order: default by avgRating desc
  if (sort === "Rating" || !sort) {
    q = query(q, orderBy("avgRating", "desc"));
  } else if (sort === "Review") {
    // or sort by number of ratings
    q = query(q, orderBy("numRatings", "desc"));
  }
  return q;
}

// Get clinicians once using optional filters (server use)
export async function getClinicians(db = db, filters = {}) {
  // start with a basic clinicians query
  let q = query(collection(db, "clinicians"));

  // apply filters and ordering
  q = applyQueryFilters(q, filters);
  // execute the query
  const results = await getDocs(q);
  // map Firestore docs to plain objects with timestamps converted
  return results.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Subscribe to restaurant query updates and invoke callback with results
export function getCliniciansSnapshot(cb, filters = {}) {
  // ensure caller provided a function
  if (typeof cb !== "function") {
    console.log("Error: The callback parameter is not a function");
    return;
  }
  // build the query and apply filters
  let q = query(collection(db, "clinicians"));
  q = applyQueryFilters(q, filters);

  // return the onSnapshot unsubscribe function
  return onSnapshot(q, (querySnapshot) => {
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      };
    });

    cb(results);
  });
}

// Get a single clinician document by id
export async function getClinicianById(db, clinicianId) {
  // validate input
  if (!clinicianId) {
    console.log("Error: Invalid ID received: ", clinicianId);
    return null;
  }
  // fetch the document and convert timestamp
  const docRef = doc(db, "clinicians", clinicianId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
    timestamp: docSnap.data().timestamp.toDate(),
  };
}

// Placeholder to subscribe to a restaurant document snapshot by id (not implemented)
export function getClinicianSnapshotById(clinicianId, cb) {
  if (!clinicianId) return () => {};
  const col = collection(db, "clinicians");
  const docRef = doc(col, clinicianId);
  const unsub = onSnapshot(docRef, (snap) => cb({ id: snap.id, ...snap.data() }));
  return unsub;
}

// Get reviews for a clinician ordered by timestamp desc
export async function getReviewsByClinicianId(db, clinicianId) {
  // validate input
  if (!clinicianId) {
    console.log("Error: Invalid clinicianId received: ", clinicianId);
    return [];
  }

  // build query for ratings subcollection ordered by timestamp desc
  const q = query(
    collection(db, "clinicians", clinicianId, "ratings"),
    orderBy("timestamp", "desc")
  );

  // execute the query and convert timestamps
  const results = await getDocs(q);
  return results.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Subscribe to review snapshots for a restaurant and call cb with results
export function getReviewsSnapshotByClinicianId(clinicianId, cb) {
  // validate input
  if (!clinicianId) {
    console.log("Error: Invalid clinicianId received: ", clinicianId);
    return () => {};
  }

  // build query for ratings ordered by timestamp desc
  const q = query(
    collection(db, "clinicians", clinicianId, "ratings"),
    orderBy("timestamp", "desc")
  );
  // subscribe and map results to plain objects
  return onSnapshot(q, (querySnapshot) => {
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      };
    });
    cb(results);
  });
}

// Add a set of fake restaurants and ratings to Firestore for testing
export async function addFakeCliniciansAndReviews() {
  const data = await generateFakeCliniciansAndReviews();
  for (const { clinicianData, ratingsData } of data) {
    try {
      const docRef = await addDoc(collection(db, "clinicians"), clinicianData);
      for (const ratingData of ratingsData) {
        await addDoc(
          collection(db, "clinicians", docRef.id, "ratings"),
          ratingData
        );
      }
    } catch (e) {
      console.log("There was an error adding the document");
      console.error("Error adding document: ", e);
    }
  }
}
