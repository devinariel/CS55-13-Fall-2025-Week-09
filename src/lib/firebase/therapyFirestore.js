// Firestore helpers for Therapy Compass (JS implementation)
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  runTransaction,
  orderBy,
  query,
  where,
  Timestamp,
  deleteDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';

import { db } from './clientApp';
import { randomData } from '../randomData';

export async function getClinicians(firestore = db, filters = {}) {
  const q = query(collection(firestore, 'clinicians'), orderBy('name'));
  const results = await getDocs(q);
  return results.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getClinicianById(firestore = db, clinicianId) {
  const ref = doc(firestore, 'clinicians', clinicianId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  // Convert timestamp if it exists
  if (data.timestamp && data.timestamp.toDate) {
    return { id: snap.id, ...data, timestamp: data.timestamp.toDate() };
  }
  return { id: snap.id, ...data };
}

export async function getReviewsForClinician(firestore = db, clinicianId) {
  const q = query(
    collection(firestore, 'reviews'),
    where('clinicianId', '==', clinicianId),
    orderBy('createdAt', 'desc')
  );
  const results = await getDocs(q);
  return results.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Alias for compatibility with code that expects getReviewsByClinicianId
export async function getReviewsByClinicianId(firestore = db, clinicianId) {
  const reviews = await getReviewsForClinician(firestore, clinicianId);
  // Convert to expected format with timestamp field
  return reviews.map(review => ({
    ...review,
    timestamp: review.createdAt?.toDate ? review.createdAt.toDate() : (review.createdAt || new Date()),
    text: review.reviewText || review.text || '',
  }));
}

// Subscribe to review snapshots for a clinician
export function getReviewsSnapshotByClinicianId(clinicianId, cb) {
  if (!clinicianId) {
    console.log("Error: Invalid clinicianId received: ", clinicianId);
    return () => {};
  }

  const q = query(
    collection(db, 'reviews'),
    where('clinicianId', '==', clinicianId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const results = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
        text: data.reviewText || data.text || '',
      };
    });
    cb(results);
  });
}

export async function submitReview(firestore = db, clinicianId, review) {
  const reviewsCol = collection(firestore, 'reviews');
  const clinicianRef = doc(firestore, 'clinicians', clinicianId);

  await runTransaction(firestore, async (tx) => {
    await addDoc(reviewsCol, { ...review, clinicianId, createdAt: Timestamp.fromDate(new Date()) });

    const reviewsQ = query(reviewsCol, where('clinicianId', '==', clinicianId));
    const snaps = await getDocs(reviewsQ);
    const all = snaps.docs.map((d) => d.data());
    const avgStyleMatch = all.reduce((s, r) => s + (r.styleMatch || 0), 0) / Math.max(1, all.length);
    const avgCulturalComp = all.reduce((s, r) => s + (r.culturalCompetence || 0), 0) / Math.max(1, all.length);

    tx.update(clinicianRef, { avgStyleMatch, avgCulturalComp });
  });
}

// Alias for compatibility with code that expects addReviewToClinician
// Note: This function uses the old rating structure, but we'll adapt it to work with reviews collection
export async function addReviewToClinician(firestore = db, clinicianId, review) {
  if (!clinicianId) {
    throw new Error("No clinician ID has been provided.");
  }
  if (!review) {
    throw new Error("A valid review has not been provided.");
  }

  // Convert old review format to new format if needed
  const reviewData = {
    userId: review.userId,
    reviewText: review.text || review.reviewText || '',
    styleMatch: review.styleMatch || review.rating || 5,
    modalityExpertise: review.modalityExpertise || 5,
    accessibility: review.accessibility || 5,
    culturalCompetence: review.culturalCompetence || 5,
  };

  await submitReview(firestore, clinicianId, reviewData);
}

// Subscribe to a clinician document snapshot by id
export function getClinicianSnapshotById(clinicianId, cb) {
  if (!clinicianId) return () => {};
  const docRef = doc(db, 'clinicians', clinicianId);
  const unsub = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      cb({ id: snap.id, ...snap.data() });
    } else {
      cb(null);
    }
  });
  return unsub;
}

// Update the photo reference on a clinician document
export async function updateClinicianImageReference(clinicianId, publicImageUrl) {
  const clinicianRef = doc(db, 'clinicians', clinicianId);
  await updateDoc(clinicianRef, { photo: publicImageUrl });
}

export async function addFakeData() {
  const cliniciansCol = collection(db, 'clinicians');
  const reviewsCol = collection(db, 'reviews');

  // Clear existing data
  const existingClinicians = await getDocs(query(cliniciansCol));
  existingClinicians.forEach(doc => deleteDoc(doc.ref));
  const existingReviews = await getDocs(query(reviewsCol));
  existingReviews.forEach(doc => deleteDoc(doc.ref));

  // Add new data
  for (const name of randomData.clinicianNames) {
    const clinician = {
      name: name,
      city: randomData.clinicianCities[Math.floor(Math.random() * randomData.clinicianCities.length)],
      specialization: randomData.clinicianSpecialties[Math.floor(Math.random() * randomData.clinicianSpecialties.length)],
      modality: randomData.clinicianModalities[Math.floor(Math.random() * randomData.clinicianModalities.length)],
      profilePicture: `https://storage.googleapis.com/firestorequickstarts.appspot.com/food_${Math.floor(Math.random() * 22) + 1}.png`,
      photo: `https://storage.googleapis.com/firestorequickstarts.appspot.com/food_${Math.floor(Math.random() * 22) + 1}.png`,
      avgStyleMatch: (Math.random() * 4 + 1).toFixed(1),
      avgCulturalComp: (Math.random() * 4 + 1).toFixed(1),
      numRatings: Math.floor(Math.random() * 50),
    };
    const clinicianDoc = await addDoc(cliniciansCol, clinician);
    
    // Add some fake reviews
    const numReviews = Math.floor(Math.random() * 5);
    for (let i = 0; i < numReviews; i++) {
      const review = randomData.clinicianReviews[Math.floor(Math.random() * randomData.clinicianReviews.length)];
      await addDoc(reviewsCol, {
        clinicianId: clinicianDoc.id,
        userId: `user_${Math.floor(Math.random() * 1000)}`,
        reviewText: review.text,
        styleMatch: review.rating,
        modalityExpertise: review.rating,
        accessibility: review.rating,
        culturalCompetence: review.rating,
        createdAt: Timestamp.fromDate(new Date()),
      });
    }
  }

  console.log('Sample data added to Firestore.');
}

// end of file
